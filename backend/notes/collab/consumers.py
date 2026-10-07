"""Live collaborative note editing over WebSocket.

Implements the authority side of CodeMirror's collab protocol
(https://codemirror.net/examples/collab/). Each note's live document and update log
live in Redis, so every server process sees the same session:

* ``pushUpdates`` is accepted only at the current version; otherwise the client pulls
  the missing updates, rebases its own and pushes again.
* Accepted updates are broadcast to everyone in the note (the sender included, which
  is how CodeMirror confirms them).
* The document is saved to the note shortly after edits stop and when an editor
  leaves, through the regular edit serializer (validation and processing pipeline).

Wire format: the client authenticates with ``{"type": "auth", "token": <JWT>}`` as its
first message, then sends requests ``{"id", "type", ...}`` answered with
``{"id", "payload"}`` or ``{"id", "error"}``. The server also pushes
``{"type": "updates"}`` and ``{"type": "saveState"}`` messages.

Presence (other editors' cursors) is relayed, never stored: clients send
``{"type": "presence", "version", "anchor", "head"}`` without an id, and the server
forwards it to the note's other editors tagged with the sender's ``peer`` id and user.
A connection's first presence is followed by ``peerJoined``, asking the others to
re-send theirs (sent then, not on connect, so the newcomer is listening for them);
``gone`` removes a peer's cursor.
"""

import asyncio
import json
import logging
import uuid
import weakref
from dataclasses import dataclass

import redis.asyncio as aioredis
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .changes import InvalidChangeSet, apply_changes, normalize_newlines, replace_all
from .persist import PersistResult, current_access, load_note, persist_document, read_note_content

logger = logging.getLogger(__name__)

SESSION_TTL = 24 * 60 * 60
MAX_LOG = 1000
MAX_UPDATES_PER_PUSH = 1000
PERSIST_DELAY = 1.5
AUTH_TIMEOUT = 10
ACCESS_RECHECK = 30
MAX_POSITION = 50_000_000

CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403


class CollabError(Exception):
    """A request that cannot be served; reported back to the requesting client."""

    def __init__(self, message: str, code: str = "invalid"):
        super().__init__(message)
        self.code = code


def _group(note_id: str) -> str:
    return f"note-collab-{note_id}"


def _key(note_id: str, suffix: str = "") -> str:
    return f"collab:note:{note_id}{suffix}"


_redis_clients: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, aioredis.Redis]" = weakref.WeakKeyDictionary()


def _redis() -> aioredis.Redis:
    loop = asyncio.get_running_loop()
    client = _redis_clients.get(loop)
    if client is None:
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_clients[loop] = client
    return client


@dataclass
class Session:
    doc: str
    version: int
    log_start: int
    saved_version: int
    base_hash: str
    save_state: str
    save_message: str
    last_user: str
    # Identifies this run of the session: versions restart at 0 when it expires and is
    # recreated, so a client's version is only meaningful together with this id.
    session_id: str


async def _read_session(r: aioredis.Redis, note_id: str) -> Session | None:
    data = await r.hgetall(_key(note_id))
    if not data:
        return None
    return Session(
        doc=data.get("doc", ""),
        version=int(data.get("version", 0)),
        log_start=int(data.get("log_start", 0)),
        saved_version=int(data.get("saved_version", 0)),
        base_hash=data.get("base_hash", ""),
        save_state=data.get("save_state", "saved"),
        save_message=data.get("save_message", ""),
        last_user=data.get("last_user", ""),
        session_id=data.get("session_id", ""),
    )


async def _set_fields(r: aioredis.Redis, note_id: str, **fields) -> None:
    pipe = r.pipeline(transaction=True)
    pipe.hset(_key(note_id), mapping={k: str(v) for k, v in fields.items()})
    pipe.expire(_key(note_id), SESSION_TTL)
    pipe.expire(_key(note_id, ":log"), SESSION_TTL)
    await pipe.execute()


async def _touch(r: aioredis.Redis, note_id: str) -> None:
    """Restart the session's expiry; it should only expire once nobody is connected."""
    pipe = r.pipeline(transaction=True)
    pipe.expire(_key(note_id), SESSION_TTL)
    pipe.expire(_key(note_id, ":log"), SESSION_TTL)
    await pipe.execute()


async def _append(r: aioredis.Redis, note_id: str, session: Session, updates: list, doc: str, **fields) -> int:
    """Append updates to the log; returns the version of the first one. Hold the session lock."""
    start = session.version
    version = start + len(updates)
    log_start = session.log_start
    pipe = r.pipeline(transaction=True)
    pipe.rpush(_key(note_id, ":log"), *(json.dumps(u) for u in updates))
    if version - log_start > MAX_LOG:
        drop = version - log_start - MAX_LOG
        pipe.ltrim(_key(note_id, ":log"), drop, -1)
        log_start += drop
    pipe.hset(
        _key(note_id),
        mapping={"doc": doc, "version": str(version), "log_start": str(log_start), **fields},
    )
    pipe.expire(_key(note_id), SESSION_TTL)
    pipe.expire(_key(note_id, ":log"), SESSION_TTL)
    await pipe.execute()
    session.doc, session.version, session.log_start = doc, version, log_start
    return start


async def _broadcast(note_id: str, payload: dict) -> None:
    await get_channel_layer().group_send(_group(note_id), {"type": "collab.message", "payload": payload})


async def _replace_with_stored(r: aioredis.Redis, note_id: str, session: Session, content: str, content_hash: str):
    """Make the live document match the stored note, as an ordinary update. Hold the session lock."""
    doc = normalize_newlines(content)
    if doc != session.doc:
        update = {"clientID": "server", "changes": replace_all(session.doc, doc)}
        start = await _append(r, note_id, session, [update], doc)
        await _broadcast(note_id, {"type": "updates", "version": start, "updates": [update]})
    await _set_fields(
        r, note_id, saved_version=session.version, base_hash=content_hash, save_state="saved", save_message=""
    )
    session.saved_version, session.base_hash, session.save_state = session.version, content_hash, "saved"
    await _broadcast(note_id, {"type": "saveState", "state": "saved", "version": session.version})


def _other_session(content: dict, session: Session) -> bool:
    """Whether a request names a version from an earlier run of the session (optional ``sessionId``)."""
    session_id = content.get("sessionId")
    return session_id is not None and session_id != session.session_id


async def _ensure_session(r: aioredis.Redis, note_id: str) -> Session:
    """Load the live session, starting it from the stored note if there is none. Hold the session lock."""
    stored = await database_sync_to_async(read_note_content)(note_id)
    if stored is None:
        raise CollabError("This note no longer exists.")
    content, content_hash = stored

    session = await _read_session(r, note_id)
    if session is None:
        session = Session(normalize_newlines(content), 0, 0, 0, content_hash, "saved", "", "", uuid.uuid4().hex)
        await r.delete(_key(note_id, ":log"))
        await _set_fields(
            r,
            note_id,
            doc=session.doc,
            version=0,
            log_start=0,
            saved_version=0,
            base_hash=content_hash,
            save_state="saved",
            save_message="",
            last_user="",
            session_id=session.session_id,
        )
    elif session.saved_version == session.version and session.base_hash != content_hash:
        # Changed outside the session while nothing here was unsaved: adopt the stored note.
        await _replace_with_stored(r, note_id, session, content, content_hash)
    return session


# Debounced saves, per process. A save that has started is never cancelled; edits
# arriving meanwhile queue one more save after it.
@dataclass
class _PersistJob:
    task: asyncio.Task | None = None
    sleeping: bool = True
    rerun: bool = False
    rerun_force: bool = False
    force: bool = False


_persist_jobs: dict[str, _PersistJob] = {}


def schedule_persist(note_id: str, delay: float = PERSIST_DELAY, force: bool = False) -> None:
    """Save the live document after ``delay`` seconds, restarting a pending wait."""
    job = _persist_jobs.get(note_id)
    if job and job.task and not job.task.done():
        if not job.sleeping:
            job.rerun = True
            job.rerun_force = job.rerun_force or force
            return
        job.task.cancel()
        force = force or job.force
    job = _PersistJob(force=force)
    job.task = asyncio.get_running_loop().create_task(_run_persist(note_id, job, delay))
    _persist_jobs[note_id] = job


async def _run_persist(note_id: str, job: _PersistJob, delay: float) -> None:
    if delay:
        await asyncio.sleep(delay)
    job.sleeping = False
    try:
        await persist_now(note_id, force=job.force)
    except Exception:
        logger.exception("Saving live note %s failed", note_id)
    finally:
        if _persist_jobs.get(note_id) is job:
            del _persist_jobs[note_id]
        if job.rerun:
            schedule_persist(note_id, delay=0, force=job.rerun_force)


async def persist_now(note_id: str, force: bool = False) -> None:
    """Save the live document to the note and broadcast the outcome."""
    r = _redis()
    async with r.lock(_key(note_id, ":persist"), timeout=120, blocking_timeout=120):
        session = await _read_session(r, note_id)
        if session is None or not session.last_user:
            return
        if session.save_state == "conflict" and not force:
            return  # waiting for someone to choose a version
        if session.version == session.saved_version and session.save_state == "saved" and not force:
            return

        await _broadcast(note_id, {"type": "saveState", "state": "saving", "version": session.version})
        try:
            result = await database_sync_to_async(persist_document)(
                note_id, session.doc, session.base_hash, session.last_user, force
            )
        except Exception:
            logger.exception("Saving live note %s failed", note_id)
            result = PersistResult("error", message="The note could not be saved.")

        if result.status == "saved":
            fields = {"base_hash": result.content_hash, "save_state": "saved", "save_message": ""}
            current = await _read_session(r, note_id)
            if current and session.version > current.saved_version:
                fields["saved_version"] = session.version
            await _set_fields(r, note_id, **fields)
        else:
            await _set_fields(r, note_id, save_state=result.status, save_message=result.message)

        await _broadcast(
            note_id,
            {
                "type": "saveState",
                "state": result.status,
                "version": session.version,
                "message": result.message,
                "contentHash": result.content_hash,
            },
        )


def _user_from_token(token) -> object | None:
    if not isinstance(token, str) or not token:
        return None
    auth = JWTAuthentication()
    try:
        return auth.get_user(auth.get_validated_token(token))
    except InvalidToken, TokenError, AuthenticationFailed:
        return None


class NoteCollabConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.note_id = str(self.scope["url_route"]["kwargs"]["note_id"])
        self.user = None
        self.can_write = False
        self.joined = False
        await self.accept()
        self.auth_timeout = asyncio.get_running_loop().create_task(self._close_if_unauthenticated())
        self.access_watch: asyncio.Task | None = None

    async def _close_if_unauthenticated(self):
        await asyncio.sleep(AUTH_TIMEOUT)
        if self.user is None:
            await self.close(code=CLOSE_UNAUTHENTICATED)

    async def disconnect(self, code):
        self.auth_timeout.cancel()
        if self.access_watch:
            self.access_watch.cancel()
        if self.joined:
            await self.channel_layer.group_discard(_group(self.note_id), self.channel_name)
            await _broadcast(self.note_id, {"type": "presence", "peer": self.peer_id, "gone": True})
        if self.can_write:
            schedule_persist(self.note_id, delay=0)

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return
        if self.user is None:
            await self._authenticate(content)
            return

        if content.get("type") == "presence":
            await self._presence(content)
            return

        request_id = content.get("id")
        handler = {
            "getDocument": self._get_document,
            "pushUpdates": self._push_updates,
            "pullUpdates": self._pull_updates,
            "saveNow": self._save_now,
            "resolveConflict": self._resolve_conflict,
        }.get(content.get("type"))
        try:
            if handler is None:
                raise CollabError("Unknown request.")
            payload = await handler(content)
        except CollabError as exc:
            await self.send_json({"id": request_id, "error": str(exc), "code": exc.code})
            return
        await self.send_json({"id": request_id, "payload": payload})

    async def collab_message(self, event):
        await self.send_json(event["payload"])

    async def _authenticate(self, content):
        user = None
        if content.get("type") == "auth":
            user = await database_sync_to_async(_user_from_token)(content.get("token"))
        if user is None:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return
        access = await database_sync_to_async(load_note)(self.note_id, user)
        if access is None or not access.can_read:
            await self.close(code=CLOSE_FORBIDDEN)
            return

        self.user = user
        self.can_write = access.can_write
        self.access_watch = asyncio.get_running_loop().create_task(self._watch_access())
        self.peer_id = uuid.uuid4().hex[:12]
        self.announced = False
        await self.channel_layer.group_add(_group(self.note_id), self.channel_name)
        self.joined = True
        await self.send_json({"type": "ready", "writable": self.can_write, "peerId": self.peer_id})

    async def _presence(self, content):
        fields = [content.get(k) for k in ("version", "anchor", "head")]
        if not all(isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= MAX_POSITION for v in fields):
            return
        version, anchor, head = fields
        await _broadcast(
            self.note_id,
            {
                "type": "presence",
                "peer": self.peer_id,
                "user": {"id": str(self.user.id), "username": self.user.username},
                "version": version,
                "anchor": anchor,
                "head": head,
            },
        )
        if not self.announced:
            self.announced = True
            await _broadcast(self.note_id, {"type": "peerJoined", "peer": self.peer_id})

    async def _watch_access(self):
        """While connected, re-check permissions and keep the live session from expiring.

        Runs on a timer rather than per message, so a connection that only listens is
        checked too. Losing read access (or the note) closes it.
        """
        while True:
            await asyncio.sleep(ACCESS_RECHECK)
            access = await database_sync_to_async(current_access)(self.note_id, self.user.id)
            if access is None or not access.can_read:
                await self.close(code=CLOSE_FORBIDDEN)
                return
            self.can_write = access.can_write
            await _touch(_redis(), self.note_id)

    def _require_write(self):
        if not self.can_write:
            raise CollabError("You do not have permission to edit this note.", code="forbidden")

    async def _get_document(self, _content):
        r = _redis()
        async with r.lock(_key(self.note_id, ":lock"), timeout=10, blocking_timeout=10):
            session = await _ensure_session(r, self.note_id)
        return {
            "sessionId": session.session_id,
            "version": session.version,
            "doc": session.doc,
            "savedVersion": session.saved_version,
            "saveState": session.save_state,
            "saveMessage": session.save_message,
        }

    async def _push_updates(self, content):
        self._require_write()
        version = content.get("version")
        updates = content.get("updates")
        if not isinstance(version, int) or not isinstance(updates, list) or not updates:
            raise CollabError("Invalid updates.")
        if len(updates) > MAX_UPDATES_PER_PUSH:
            raise CollabError("Too many updates.")
        if not all(isinstance(u, dict) and isinstance(u.get("clientID"), str) for u in updates):
            raise CollabError("Invalid updates.")
        updates = [{"clientID": u["clientID"], "changes": u.get("changes")} for u in updates]

        r = _redis()
        async with r.lock(_key(self.note_id, ":lock"), timeout=10, blocking_timeout=10):
            session = await _read_session(r, self.note_id) or await _ensure_session(r, self.note_id)
            if version > session.version or _other_session(content, session):
                # The server lost this session (it expired or was reset): start over.
                raise CollabError("resync", code="resync")
            if version != session.version:
                return False
            doc = session.doc
            try:
                for update in updates:
                    doc = apply_changes(doc, update["changes"])
            except InvalidChangeSet as exc:
                raise CollabError("Invalid updates.") from exc
            start = await _append(r, self.note_id, session, updates, doc, last_user=str(self.user.id))

        await _broadcast(self.note_id, {"type": "updates", "version": start, "updates": updates})
        schedule_persist(self.note_id)
        return True

    async def _pull_updates(self, content):
        version = content.get("version")
        if not isinstance(version, int) or version < 0:
            raise CollabError("Invalid version.")
        r = _redis()
        # Under the lock: a push may trim the log between reading log_start and the log.
        async with r.lock(_key(self.note_id, ":lock"), timeout=10, blocking_timeout=10):
            session = await _read_session(r, self.note_id)
            if (
                session is None
                or version < session.log_start
                or version > session.version
                or _other_session(content, session)
            ):
                raise CollabError("resync", code="resync")
            entries = await r.lrange(_key(self.note_id, ":log"), version - session.log_start, -1)
        return {
            "version": version,
            "updates": [json.loads(e) for e in entries],
            # Save state may have changed while this client was away.
            "savedVersion": session.saved_version,
            "saveState": session.save_state,
            "saveMessage": session.save_message,
        }

    async def _save_now(self, _content):
        self._require_write()
        schedule_persist(self.note_id, delay=0)
        return True

    async def _resolve_conflict(self, content):
        self._require_write()
        choice = content.get("choice")
        if choice == "mine":
            schedule_persist(self.note_id, delay=0, force=True)
        elif choice == "theirs":
            r = _redis()
            async with r.lock(_key(self.note_id, ":lock"), timeout=10, blocking_timeout=10):
                session = await _ensure_session(r, self.note_id)
                stored = await database_sync_to_async(read_note_content)(self.note_id)
                if stored is None:
                    raise CollabError("This note no longer exists.")
                await _replace_with_stored(r, self.note_id, session, *stored)
        else:
            raise CollabError("Invalid choice.")
        return True

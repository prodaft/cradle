import asyncio
import uuid
from unittest.mock import patch

from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken

from access.enums import AccessType
from access.models import Access
from cradle.asgi import application
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from user.models import CradleUser

from ..collab import consumers
from ..collab.changes import InvalidChangeSet, apply_changes, replace_all
from ..models import Note

# Generated with @codemirror/state: (document, ChangeSet.toJSON(), result).
CODEMIRROR_VECTORS = [
    ("hello world", [6, [5, "there"]], "hello there"),
    ("line1\nline2\nline3", [[0, "# "], 5, [7], 5], "# line1line3"),
    ("a😀b", [3, [0, "X"], 1], "a😀Xb"),
    ("😀😀", [2, [2, "two", "lines 🎉"]], "😀two\nlines 🎉"),
    ("", [[0, "new", "doc"]], "new\ndoc"),
    ("keep", [[4]], ""),
    ("abc", [1, [0, "X"], 2, [0, "", ""]], "aXbc\n"),
]


class ApplyChangesTest(TransactionTestCase):
    def test_matches_codemirror(self):
        for doc, changes, result in CODEMIRROR_VECTORS:
            with self.subTest(doc=doc):
                self.assertEqual(apply_changes(doc, changes), result)

    def test_rejects_changes_that_do_not_fit(self):
        for changes in ([3], [[5]], [1, "x"], "nope", [[-1]], [True]):
            with self.subTest(changes=changes), self.assertRaises(InvalidChangeSet):
                apply_changes("abcd", changes)

    def test_replace_all(self):
        for old, new in [("a😀\nb", "new\ntext"), ("", "x"), ("x", ""), ("", "")]:
            with self.subTest(old=old, new=new):
                self.assertEqual(apply_changes(old, replace_all(old, new)), new)


class NoteCollabConsumerTest(TransactionTestCase):
    def setUp(self):
        self.author = CradleUser.objects.create_user(
            username="author", password="pass", email="a@x.y", is_active=True, email_confirmed=True
        )
        self.reader = CradleUser.objects.create_user(
            username="reader", password="pass", email="r@x.y", is_active=True, email_confirmed=True
        )
        case = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        entity = Entry.objects.create(name="live", entry_class=case)
        self.note = Note.objects.create(author=self.author, fleeting=True, content="hello")
        self.shared = Note.objects.create(author=self.author, fleeting=False, content="shared")
        self.shared.entries.add(entity)
        Access.objects.create(user=self.reader, entity=entity, access_type=AccessType.READ)

    def tearDown(self):
        async def clear():
            r = consumers._redis()
            for note in (self.note, self.shared):
                await r.delete(*(consumers._key(str(note.id), s) for s in ("", ":log", ":lock", ":persist")))
            await r.aclose()

        asyncio.run(clear())

    async def connect(self, user, note=None):
        note = note or self.note
        comm = WebsocketCommunicator(
            application, f"/api/ws/notes/{note.id}/", headers=[(b"origin", b"http://localhost")]
        )
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await comm.send_json_to({"type": "auth", "token": str(AccessToken.for_user(user))})
        return comm

    async def request(self, comm, **message):
        message.setdefault("id", uuid.uuid4().hex)
        await comm.send_json_to(message)
        while True:
            reply = await comm.receive_json_from(timeout=5)
            if reply.get("id") == message["id"]:
                return reply

    async def receive_type(self, comm, type_, **match):
        while True:
            message = await comm.receive_json_from(timeout=5)
            if message.get("type") == type_ and all(message.get(k) == v for k, v in match.items()):
                return message

    async def test_rejects_invalid_token(self):
        comm = WebsocketCommunicator(
            application, f"/api/ws/notes/{self.note.id}/", headers=[(b"origin", b"http://localhost")]
        )
        await comm.connect()
        await comm.send_json_to({"type": "auth", "token": "garbage"})
        self.assertEqual((await comm.receive_output(timeout=5))["code"], consumers.CLOSE_UNAUTHENTICATED)

    async def test_rejects_user_without_access(self):
        comm = await self.connect(self.reader)  # fleeting note: author only
        self.assertEqual((await comm.receive_output(timeout=5))["code"], consumers.CLOSE_FORBIDDEN)

    async def test_push_is_broadcast_and_version_checked(self):
        a, b = await self.connect(self.author), await self.connect(self.author)
        for comm in (a, b):
            self.assertIs((await self.receive_type(comm, "ready"))["writable"], True)
        doc = (await self.request(a, type="getDocument"))["payload"]
        self.assertEqual((doc["version"], doc["doc"]), (0, "hello"))

        update = {"clientID": "a", "changes": [5, [0, " world"]]}
        self.assertTrue((await self.request(a, type="pushUpdates", version=0, updates=[update]))["payload"])
        self.assertEqual(await self.receive_type(b, "updates"), {"type": "updates", "version": 0, "updates": [update]})
        stale = await self.request(
            b, type="pushUpdates", version=0, updates=[{"clientID": "b", "changes": [11, [0, "!"]]}]
        )
        self.assertFalse(stale["payload"])
        pulled = await self.request(b, type="pullUpdates", version=0)
        self.assertEqual(pulled["payload"]["updates"], [update])
        self.assertEqual(pulled["payload"]["saveState"], "saved")
        await a.disconnect()
        await b.disconnect()

    async def test_reader_cannot_push(self):
        comm = await self.connect(self.reader, self.shared)
        self.assertIs((await self.receive_type(comm, "ready"))["writable"], False)
        await self.request(comm, type="getDocument")
        reply = await self.request(
            comm, type="pushUpdates", version=0, updates=[{"clientID": "r", "changes": [[0, "x"], 6]}]
        )
        self.assertIn("permission", reply["error"])
        await comm.disconnect()

    async def test_invalid_changes_are_rejected(self):
        comm = await self.connect(self.author)
        await self.request(comm, type="getDocument")
        reply = await self.request(comm, type="pushUpdates", version=0, updates=[{"clientID": "a", "changes": [99]}])
        self.assertEqual(reply["error"], "Invalid updates.")
        await comm.disconnect()

    async def test_edits_are_saved_to_the_note(self):
        comm = await self.connect(self.author)
        await self.request(comm, type="getDocument")
        await self.request(comm, type="pushUpdates", version=0, updates=[{"clientID": "a", "changes": [5, [0, "!"]]}])
        await consumers.persist_now(str(self.note.id))
        saved = await self.receive_type(comm, "saveState", state="saved")
        self.assertEqual(saved["version"], 1)
        await sync_to_async(self.note.refresh_from_db)()
        self.assertEqual(self.note.content, "hello!")
        await comm.disconnect()

    async def test_outside_change_is_a_conflict_until_resolved(self):
        comm = await self.connect(self.author)
        await self.request(comm, type="getDocument")
        await self.request(comm, type="pushUpdates", version=0, updates=[{"clientID": "a", "changes": [5, [0, "!"]]}])
        await sync_to_async(Note.objects.filter(id=self.note.id).update)(content="theirs")

        await consumers.persist_now(str(self.note.id))
        await self.receive_type(comm, "saveState", state="conflict")
        await sync_to_async(self.note.refresh_from_db)()
        self.assertEqual(self.note.content, "theirs")

        await self.request(comm, type="resolveConflict", choice="theirs")
        replaced = await self.receive_type(comm, "updates")
        self.assertEqual(apply_changes("hello!", replaced["updates"][0]["changes"]), "theirs")
        await self.receive_type(comm, "saveState", state="saved")
        await comm.disconnect()

    async def test_resolve_with_mine_overwrites(self):
        comm = await self.connect(self.author)
        await self.request(comm, type="getDocument")
        await self.request(comm, type="pushUpdates", version=0, updates=[{"clientID": "a", "changes": [5, [0, "!"]]}])
        await sync_to_async(Note.objects.filter(id=self.note.id).update)(content="theirs")
        await consumers.persist_now(str(self.note.id))
        await self.receive_type(comm, "saveState", state="conflict")

        await consumers.persist_now(str(self.note.id), force=True)
        await self.receive_type(comm, "saveState", state="saved")
        await sync_to_async(self.note.refresh_from_db)()
        self.assertEqual(self.note.content, "hello!")
        await comm.disconnect()

    async def test_presence_is_relayed_with_identity(self):
        a, b = await self.connect(self.author), await self.connect(self.author)
        ready_a = await self.receive_type(a, "ready")
        ready_b = await self.receive_type(b, "ready")
        self.assertNotEqual(ready_a["peerId"], ready_b["peerId"])

        await a.send_json_to({"type": "presence", "version": 0, "anchor": 1, "head": 3})
        presence = await self.receive_type(b, "presence")
        self.assertEqual(
            presence,
            {
                "type": "presence",
                "peer": ready_a["peerId"],
                "user": {"id": str(self.author.id), "username": "author"},
                "version": 0,
                "anchor": 1,
                "head": 3,
            },
        )
        # The first presence announces the sender, so the others re-send theirs.
        self.assertEqual(await self.receive_type(b, "peerJoined"), {"type": "peerJoined", "peer": ready_a["peerId"]})

        await a.send_json_to({"type": "presence", "version": 0, "anchor": -1, "head": "x"})
        await a.disconnect()
        self.assertEqual(
            await self.receive_type(b, "presence"), {"type": "presence", "peer": ready_a["peerId"], "gone": True}
        )
        await b.disconnect()

    async def test_revoked_access_is_enforced_on_open_connections(self):
        await sync_to_async(Access.objects.filter(user=self.reader).update)(access_type=AccessType.READ_WRITE)
        with patch.object(consumers, "ACCESS_RECHECK", 0.1):
            comm = await self.connect(self.reader, self.shared)
            self.assertIs((await self.receive_type(comm, "ready"))["writable"], True)
            await self.request(comm, type="getDocument")

            await sync_to_async(Access.objects.filter(user=self.reader).update)(access_type=AccessType.READ)
            await asyncio.sleep(0.5)
            reply = await self.request(
                comm, type="pushUpdates", version=0, updates=[{"clientID": "r", "changes": [[0, "x"], 6]}]
            )
            self.assertEqual(reply["code"], "forbidden")

            # A connection that only listens loses access too.
            await sync_to_async(Access.objects.filter(user=self.reader).delete)()
            while (message := await comm.receive_output(timeout=5))["type"] != "websocket.close":
                pass
            self.assertEqual(message["code"], consumers.CLOSE_FORBIDDEN)

    async def test_push_ahead_of_a_lost_session_asks_for_resync(self):
        comm = await self.connect(self.author)
        await self.request(comm, type="getDocument")
        await self.request(comm, type="pushUpdates", version=0, updates=[{"clientID": "a", "changes": [5, [0, "!"]]}])
        r = consumers._redis()
        await r.delete(consumers._key(str(self.note.id)), consumers._key(str(self.note.id), ":log"))

        reply = await self.request(
            comm, type="pushUpdates", version=1, updates=[{"clientID": "a", "changes": [6, [0, "?"]]}]
        )
        self.assertEqual(reply["code"], "resync")
        await comm.disconnect()

    async def test_session_id_identifies_a_run_of_the_session(self):
        comm = await self.connect(self.author)
        first = (await self.request(comm, type="getDocument"))["payload"]["sessionId"]
        self.assertTrue(first)
        same = await self.request(comm, type="pullUpdates", version=0, sessionId=first)
        self.assertEqual(same["payload"]["updates"], [])

        r = consumers._redis()
        await r.delete(consumers._key(str(self.note.id)), consumers._key(str(self.note.id), ":log"))
        recreated = (await self.request(comm, type="getDocument"))["payload"]["sessionId"]
        self.assertNotEqual(recreated, first)

        # Versions from the earlier run must not be applied to the new one.
        stale_pull = await self.request(comm, type="pullUpdates", version=0, sessionId=first)
        self.assertEqual(stale_pull["code"], "resync")
        stale_push = await self.request(
            comm, type="pushUpdates", version=0, sessionId=first, updates=[{"clientID": "a", "changes": [5, [0, "!"]]}]
        )
        self.assertEqual(stale_push["code"], "resync")
        current = await self.request(comm, type="pullUpdates", version=0, sessionId=recreated)
        self.assertEqual(current["payload"]["updates"], [])
        await comm.disconnect()

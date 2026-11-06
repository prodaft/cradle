"""Keep a WebSocket only as long as the login session and access token it was opened with."""

import asyncio

from channels.db import database_sync_to_async
from django.utils import timezone

from .authentication import WebSocketSession, websocket_session
from .realtime import session_group

CLOSE_UNAUTHENTICATED = 4401


class SessionBoundConsumerMixin:
    """For Channels consumers: closes with 4401 when the session is revoked or the access token expires.

    The client then refreshes its token and reconnects, or signs in again if the session is gone.
    """

    bound_session_id: str | None = None
    session_expiry: asyncio.TimerHandle | None = None

    async def open_session(self, content) -> WebSocketSession | None:
        """Authenticate the first message: return the cookie's session, or close with 4401 and return None."""
        session = None
        if content.get("type") == "auth":
            session = await database_sync_to_async(websocket_session)(self.scope)
        if session is None:
            await self.close(code=CLOSE_UNAUTHENTICATED)
        return session

    async def bind_session(self, session: WebSocketSession) -> None:
        self.bound_session_id = session.session_id
        await self.channel_layer.group_add(session_group(session.session_id), self.channel_name)
        loop = asyncio.get_running_loop()
        delay = max(0.0, (session.expires_at - timezone.now()).total_seconds())
        self.session_expiry = loop.call_later(delay, lambda: loop.create_task(self.close(code=CLOSE_UNAUTHENTICATED)))

    async def unbind_session(self) -> None:
        if self.session_expiry is not None:
            self.session_expiry.cancel()
            self.session_expiry = None
        if self.bound_session_id is not None:
            await self.channel_layer.group_discard(session_group(self.bound_session_id), self.channel_name)
            self.bound_session_id = None

    async def session_ended(self, event) -> None:
        await self.close(code=CLOSE_UNAUTHENTICATED)

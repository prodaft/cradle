"""Per-user WebSocket that signals new notifications.

The client authenticates with ``{"type": "auth"}`` as its first message (the access
JWT is read from the handshake's HttpOnly cookie), then only listens. Each new
notification is ``{"type": "notification"}`` with its id, text, and type; the client refetches the list and unread
count over HTTP. ``{"type": "ping"}`` is answered with ``{"type": "pong"}`` so an idle
connection survives proxies.
"""

import asyncio

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from user.websocket import CLOSE_UNAUTHENTICATED, SessionBoundConsumerMixin

from .realtime import group_name

AUTH_TIMEOUT = 10


class NotificationConsumer(SessionBoundConsumerMixin, AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.joined = False
        self.auth_timeout: asyncio.Task | None = None
        await self.accept()
        self.auth_timeout = asyncio.get_running_loop().create_task(self._close_if_unauthenticated())

    async def _close_if_unauthenticated(self):
        await asyncio.sleep(AUTH_TIMEOUT)
        if self.user is None:
            await self.close(code=CLOSE_UNAUTHENTICATED)

    async def disconnect(self, code):
        timeout = self.auth_timeout
        self.auth_timeout = None
        if timeout is not None and timeout is not asyncio.current_task():
            timeout.cancel()
        await self.unbind_session()
        if self.joined:
            await self.channel_layer.group_discard(group_name(self.user.id), self.channel_name)

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return
        if self.user is None:
            await self._authenticate(content)
            return
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def notification_created(self, event):
        await self.send_json(
            {
                "type": "notification",
                "id": event.get("id") or "",
                "message": event.get("message") or "",
                "notificationType": event.get("notification_type") or "message_notification",
            }
        )

    async def _authenticate(self, content):
        session = await self.open_session(content)
        if session is None:
            return
        self.user = user = session.user
        await self.bind_session(session)
        await self.channel_layer.group_add(group_name(user.id), self.channel_name)
        self.joined = True
        await self.send_json({"type": "ready"})

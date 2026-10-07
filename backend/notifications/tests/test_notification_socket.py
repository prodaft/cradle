"""Tests for the per-user notification WebSocket signal."""

from unittest.mock import patch

from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.db import transaction
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken

from cradle.asgi import application
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from user.models import CradleUser

from ..consumers import CLOSE_UNAUTHENTICATED
from ..models import AccessRequestNotification, MessageNotification


class NotificationSocketTest(TransactionTestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="notify", password="pass", email="n@x.y", is_active=True
        )
        self.other = CradleUser.objects.create_user(
            username="other", password="pass", email="o@x.y", is_active=True
        )
        entry_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.entity = Entry.objects.create(name="Entity", entry_class=entry_class)

    def tearDown(self):
        self.patcher.stop()

    def _communicator(self, user=None, token="garbage"):
        if user is not None:
            token = str(AccessToken.for_user(user))
        return WebsocketCommunicator(
            application,
            "/api/ws/notifications/",
            headers=[
                (b"origin", b"http://localhost"),
                (b"cookie", f"access_token={token}".encode()),
            ],
        )

    async def _connect(self, user):
        comm = self._communicator(user)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await comm.send_json_to({"type": "auth"})
        self.assertEqual(await comm.receive_json_from(timeout=5), {"type": "ready"})
        return comm

    async def test_rejects_invalid_token(self):
        comm = self._communicator()
        await comm.connect()
        await comm.send_json_to({"type": "auth"})
        self.assertEqual((await comm.receive_output(timeout=5))["code"], CLOSE_UNAUTHENTICATED)

    async def test_closes_without_auth(self):
        from .. import consumers

        with patch.object(consumers, "AUTH_TIMEOUT", 0.05):
            comm = self._communicator(self.user)
            await comm.connect()
            self.assertEqual((await comm.receive_output(timeout=5))["code"], CLOSE_UNAUTHENTICATED)

    async def test_ping(self):
        comm = await self._connect(self.user)
        await comm.send_json_to({"type": "ping"})
        self.assertEqual(await comm.receive_json_from(timeout=5), {"type": "pong"})
        await comm.disconnect()

    async def test_signals_only_the_recipient(self):
        mine = await self._connect(self.user)
        second = await self._connect(self.user)
        other = await self._connect(self.other)

        created = await sync_to_async(MessageNotification.objects.create)(user=self.user, message="hello")
        hello = {
            "type": "notification",
            "id": str(created.id),
            "message": "hello",
            "notificationType": "message_notification",
        }
        self.assertEqual(await mine.receive_json_from(timeout=5), hello)
        self.assertEqual(await second.receive_json_from(timeout=5), hello)
        self.assertTrue(await mine.receive_nothing(timeout=0.3))
        self.assertTrue(await other.receive_nothing(timeout=0.3))

        access = await sync_to_async(AccessRequestNotification.objects.create)(
            user=self.user,
            requesting_user=self.other,
            entity=self.entity,
            message="access",
        )
        access_signal = {
            "type": "notification",
            "id": str(access.id),
            "message": "access",
            "notificationType": "request_access_notification",
        }
        self.assertEqual(await mine.receive_json_from(timeout=5), access_signal)
        self.assertEqual(await second.receive_json_from(timeout=5), access_signal)
        self.assertTrue(await mine.receive_nothing(timeout=0.3))
        self.assertTrue(await other.receive_nothing(timeout=0.3))

        await mine.disconnect()
        await second.disconnect()
        await other.disconnect()

    async def test_rolled_back_create_is_not_signaled(self):
        comm = await self._connect(self.user)

        def create_and_rollback():
            with transaction.atomic():
                MessageNotification.objects.create(user=self.user, message="nope")
                raise RuntimeError("rollback")

        with self.assertRaises(RuntimeError):
            await sync_to_async(create_and_rollback)()
        self.assertTrue(await comm.receive_nothing(timeout=0.3))
        await comm.disconnect()

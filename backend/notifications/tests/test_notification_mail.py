"""Notification email is queued only after the creating transaction commits."""

from unittest.mock import patch

from user.models import CradleUser

from ..models import NewUserNotification
from .utils import NotificationsTestCase


class NotificationMailTest(NotificationsTestCase):
    def setUp(self):
        super().setUp()
        self.admin = CradleUser.objects.create_user(username="admin", password="password", email="a@b.c")
        self.new_user = CradleUser.objects.create_user(username="new", password="password", email="n@b.c")

    def create(self):
        return NewUserNotification.objects.create(user=self.admin, new_user=self.new_user, message="New user")

    @patch("mail.models.send_email_task.delay")
    def test_mail_queued_on_commit(self, delay):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.create()
        delay.assert_not_called()

        for callback in callbacks:
            callback()
        delay.assert_called_once()

    @patch("mail.models.send_email_task.delay", side_effect=ConnectionError("broker down"))
    def test_broker_failure_does_not_raise(self, _delay):
        with self.captureOnCommitCallbacks(execute=True):
            notification = self.create()
        self.assertTrue(NewUserNotification.objects.filter(pk=notification.pk).exists())

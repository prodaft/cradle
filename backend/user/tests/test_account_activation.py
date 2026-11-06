"""A user whose account an admin activates is told by email, since they cannot sign in to see notifications."""

from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APIClient

from user.testing import session_access_token

from ..models import CradleUser, UserRoles
from .utils import UserTestCase


@patch("mail.models.send_email_task.delay")
class AccountActivationMailTest(UserTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        admin = CradleUser.objects.create_user(username="boss", password="pw", email="boss@x.y", role=UserRoles.ADMIN)
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}
        self.pending = CradleUser.objects.create_user(
            username="pending", password="pw", email="pending@x.y", is_active=False, email_confirmed=True
        )

    def patch_user(self, body):
        url = reverse("user_detail", kwargs={"user_id": self.pending.id})
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(url, body, format="json", **self.headers)
        self.assertEqual(response.status_code, 200, response.content)

    def test_activation_emails_the_user(self, send):
        self.patch_user({"is_active": True})

        send.assert_called_once()
        self.assertEqual(send.call_args.kwargs["recipient"], "pending@x.y")
        self.assertEqual(send.call_args.kwargs["subject"], "CRADLE - Your Account Is Active")

    def test_other_edits_send_nothing(self, send):
        self.patch_user({"is_active": True})
        send.reset_mock()

        self.patch_user({"is_active": True})
        self.patch_user({"is_active": False})

        send.assert_not_called()

    def test_user_who_must_still_confirm_their_email_is_not_told_to_sign_in(self, send):
        CradleUser.objects.filter(pk=self.pending.pk).update(email_confirmed=False)

        self.patch_user({"is_active": True})

        send.assert_not_called()

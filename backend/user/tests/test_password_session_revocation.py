import json
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from user.testing import login_tokens

from ..models import BlacklistedToken, CradleUser, UserSession
from .utils import UserTestCase

PASSWORD = "userR1#1234112"
NEW_PASSWORD = "newR1#9876543210"


class PasswordSessionRevocationTest(UserTestCase):
    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(username="user", password=PASSWORD, email="a@b.c")
        # Two login sessions, each a (refresh, access) token pair.
        self.current = login_tokens(self.user)
        self.other = login_tokens(self.user)

    def test_change_password_revokes_other_sessions(self):
        response = self.client.post(
            reverse("user_password_me"),
            data=json.dumps({"old_password": PASSWORD, "new_password": NEW_PASSWORD}),
            content_type="application/json",
            HTTP_COOKIE=f"access_token={self.current[1]}; refresh_token={self.current[0]}",
        )
        self.assertEqual(response.status_code, 200)

        remaining = set(UserSession.objects.filter(user=self.user).values_list("refresh_token_jti", flat=True))
        self.assertEqual(remaining, {self.current[0]["jti"]})
        self.assertTrue(BlacklistedToken.is_blacklisted(self.other[0]["jti"]))
        self.assertFalse(BlacklistedToken.is_blacklisted(self.current[0]["jti"]))

    def test_reset_password_revokes_all_sessions(self):
        self.user.password_reset_token = "reset-token"
        self.user.password_reset_token_expiry = timezone.now() + timedelta(hours=1)
        self.user.save()

        response = self.client.post(
            reverse("auth_password_reset_confirm"),
            data=json.dumps({"token": "reset-token", "password": NEW_PASSWORD}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        self.assertFalse(UserSession.objects.filter(user=self.user).exists())
        self.assertTrue(BlacklistedToken.is_blacklisted(self.current[0]["jti"]))
        self.assertTrue(BlacklistedToken.is_blacklisted(self.other[0]["jti"]))

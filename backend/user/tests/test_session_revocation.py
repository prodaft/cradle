"""Revoking a login session stops its access tokens at once, and refresh keeps the session."""

import json
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import CradleUser, UserSession
from ..testing import login_tokens
from .utils import UserTestCase

PASSWORD = "userR1#1234112"


class SessionRevocationTest(UserTestCase):
    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(username="user", password=PASSWORD, email="a@b.c")
        self.refresh, self.access = login_tokens(self.user)

    def get_me(self, access=None):
        cookie = f"access_token={access or self.access}"
        return self.client.get(reverse("user_detail_me"), HTTP_COOKIE=cookie)

    def test_revoked_session_stops_its_access_token(self):
        other_refresh, other_access = login_tokens(self.user)
        self.assertEqual(self.get_me(other_access).status_code, 200)

        response = self.client.delete(
            reverse("user_session_revoke_me", kwargs={"session_id": other_refresh["sid"]}),
            HTTP_COOKIE=f"access_token={self.access}",
        )
        self.assertEqual(response.status_code, 204, response.content)

        self.assertEqual(self.get_me(other_access).status_code, 401)
        self.assertEqual(self.get_me().status_code, 200)

    def test_logout_stops_the_access_token(self):
        self.client.post(reverse("auth_logout"), HTTP_COOKIE=f"refresh_token={self.refresh}")
        self.assertEqual(self.get_me().status_code, 401)

    def test_password_change_stops_other_sessions_access_tokens(self):
        _, other_access = login_tokens(self.user)
        response = self.client.post(
            reverse("user_password_me"),
            data=json.dumps({"old_password": PASSWORD, "new_password": "newR1#9876543210"}),
            content_type="application/json",
            HTTP_COOKIE=f"access_token={self.access}; refresh_token={self.refresh}",
        )
        self.assertEqual(response.status_code, 200, response.content)

        self.assertEqual(self.get_me(other_access).status_code, 401)
        self.assertEqual(self.get_me().status_code, 200)

    def test_deactivation_ends_all_sessions(self):
        self.user.is_active = False
        self.user.save()

        self.assertFalse(UserSession.objects.filter(user=self.user).exists())

    def test_refresh_keeps_the_session(self):
        response = self.client.post(reverse("auth_refresh"), HTTP_COOKIE=f"refresh_token={self.refresh}")

        self.assertEqual(response.status_code, 200, response.content)
        new_refresh = RefreshToken(response.cookies["refresh_token"].value)
        self.assertEqual(new_refresh["sid"], self.refresh["sid"])
        session = UserSession.objects.get(id=self.refresh["sid"])
        self.assertEqual(session.refresh_token_jti, new_refresh["jti"])
        self.assertEqual(self.get_me(response.cookies["access_token"].value).status_code, 200)

    def test_refresh_without_session_id_is_rejected(self):
        legacy = RefreshToken.for_user(self.user)
        UserSession.objects.create(
            user=self.user, refresh_token_jti=legacy["jti"], expires_at=timezone.now() + timedelta(days=1)
        )

        response = self.client.post(reverse("auth_refresh"), HTTP_COOKIE=f"refresh_token={legacy}")

        self.assertEqual(response.status_code, 401, response.content)

    def test_token_without_session_id_is_rejected(self):
        legacy_access = RefreshToken.for_user(self.user).access_token
        self.assertEqual(self.get_me(legacy_access).status_code, 401)

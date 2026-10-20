import json
import uuid
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from notifications.models import MessageNotification
from user.testing import session_access_token

from ..models import BlacklistedToken, CradleUser, UserSession
from .utils import UserTestCase

NEW_PASSWORD = "N3w-Passw0rd!xyz"


class UserDetailTest(UserTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c")
        self.user2 = CradleUser.objects.create_user(username="user2", password="user2", email="a@b.e")
        self.admin = CradleUser.objects.create_superuser(username="admin", password="admin", email="b@c.d")
        self.token_admin = str(session_access_token(self.admin))
        self.token_normal = str(session_access_token(self.user))
        self.token_normal2 = str(session_access_token(self.user2))
        self.headers_admin = {"HTTP_COOKIE": f"access_token={self.token_admin}"}
        self.headers_normal = {"HTTP_COOKIE": f"access_token={self.token_normal}"}
        self.headers_normal2 = {"HTTP_COOKIE": f"access_token={self.token_normal2}"}

    def test_delete_user_successfully(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 204)

    def test_delete_user_not_found(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": uuid.uuid4()}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_user_not_authenticated(self):
        response = self.client.delete(reverse("user_detail", kwargs={"user_id": self.user.id}))

        self.assertEqual(response.status_code, 401)

    def test_delete_other_user_is_not_found_for_non_admin(self):
        """Users that cannot see another account must not learn that it exists."""
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            **self.headers_normal2,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_user_authorized(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            data=json.dumps({"password": "user"}),
            content_type="application/json",
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 204)

    def test_delete_user_cannot_remove_admin(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.admin.id}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_admin_cannot_remove_another_admin(self):
        """Visible but not manageable: 403."""
        other_admin = CradleUser.objects.create_superuser(username="admin2", password="admin2", email="c@d.e")
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": other_admin.id}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 403)

    def test_patch_own_password_rejected(self):
        response = self.client.patch(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            data=json.dumps({"password": NEW_PASSWORD}),
            content_type="application/json",
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("user"))

    def test_patch_password_rejected_for_admin(self):
        response = self.client.patch(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            data=json.dumps({"password": NEW_PASSWORD}),
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("user"))

    def _set_password(self, user_id, body, headers):
        return self.client.post(
            reverse("user_set_password", kwargs={"user_id": user_id}),
            data=json.dumps(body),
            content_type="application/json",
            **headers,
        )

    def test_admin_set_password(self):
        session = UserSession.objects.create(
            user=self.user,
            refresh_token_jti="jti-1",
            expires_at=timezone.now() + timedelta(days=1),
        )

        response = self._set_password(
            self.user.id, {"new_password": NEW_PASSWORD, "password": "admin"}, self.headers_admin
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertFalse(UserSession.objects.filter(id=session.id).exists())
        self.assertTrue(BlacklistedToken.is_blacklisted("jti-1"))
        self.assertTrue(MessageNotification.objects.filter(user=self.user).exists())

    def test_admin_set_password_requires_step_up(self):
        for step_up in ({}, {"password": "wrong"}):
            response = self._set_password(self.user.id, {"new_password": NEW_PASSWORD, **step_up}, self.headers_admin)
            self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("user"))

    def test_admin_set_password_enforces_policy(self):
        response = self._set_password(self.user.id, {"new_password": "weak", "password": "admin"}, self.headers_admin)

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("user"))

    def test_admin_set_password_rejects_self(self):
        response = self._set_password(
            self.admin.id, {"new_password": NEW_PASSWORD, "password": "admin"}, self.headers_admin
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_set_password_rejects_other_admin(self):
        other_admin = CradleUser.objects.create_superuser(username="admin2", password="admin2", email="c@d.e")

        response = self._set_password(
            other_admin.id, {"new_password": NEW_PASSWORD, "password": "admin"}, self.headers_admin
        )

        self.assertEqual(response.status_code, 403)
        other_admin.refresh_from_db()
        self.assertTrue(other_admin.check_password("admin2"))

    def test_set_password_requires_admin(self):
        response = self._set_password(
            self.user2.id, {"new_password": NEW_PASSWORD, "password": "user"}, self.headers_normal
        )

        self.assertEqual(response.status_code, 403)
        self.user2.refresh_from_db()
        self.assertTrue(self.user2.check_password("user2"))

    def test_get_me_returns_own_profile(self):
        """GET /users/me/ returns the authenticated user's profile."""
        response = self.client.get(
            reverse("user_detail_me"),
            **self.headers_normal,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "user")

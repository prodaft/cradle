import json

from django.urls import reverse
from django_otp.plugins.otp_totp.models import TOTPDevice

from user.testing import session_access_token

from ..models import CradleUser
from .utils import UserTestCase


class StepUpAuthTest(UserTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="userR1#1234112", email="a@b.c")
        self.token = str(session_access_token(self.user))
        self.headers = {"HTTP_COOKIE": f"access_token={self.token}"}

    def test_delete_own_account_requires_password(self):
        response = self.client.delete(
            reverse("user_detail_me"),
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_delete_own_account_wrong_password(self):
        response = self.client.delete(
            reverse("user_detail_me"),
            data=json.dumps({"password": "wrong-password"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_delete_own_account_with_password(self):
        response = self.client.delete(
            reverse("user_detail_me"),
            data=json.dumps({"password": "userR1#1234112"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(CradleUser.objects.filter(username="user").exists())

    def test_generate_api_key_requires_password(self):
        response = self.client.post(
            reverse("user_api_key", kwargs={"user_id": self.user.id}),
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_fake_api_key_header_does_not_skip_step_up(self):
        for method, url in (
            (self.client.post, reverse("user_api_key", kwargs={"user_id": self.user.id})),
            (self.client.delete, reverse("user_detail_me")),
        ):
            response = method(
                url, data=json.dumps({}), content_type="application/json", HTTP_API_KEY="fake", **self.headers
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")
        self.assertTrue(CradleUser.objects.filter(pk=self.user.pk).exists())

    def test_real_api_key_skips_step_up(self):
        key = self.user.generate_api_key()

        response = self.client.post(
            reverse("user_api_key", kwargs={"user_id": self.user.id}),
            data=json.dumps({}),
            content_type="application/json",
            HTTP_API_KEY=key,
        )
        self.assertEqual(response.status_code, 201)

    def test_generate_api_key_with_password(self):
        response = self.client.post(
            reverse("user_api_key", kwargs={"user_id": self.user.id}),
            data=json.dumps({"password": "userR1#1234112"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("api_key", response.data)

    def test_enable_2fa_requires_password(self):
        response = self.client.post(
            reverse("user_2fa_enable"),
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_enable_2fa_with_password(self):
        response = self.client.post(
            reverse("user_2fa_enable"),
            data=json.dumps({"password": "userR1#1234112"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("config_url", response.data)


class TwoFactorCodeWhileSignedInTest(UserTestCase):
    """A wrong code from a signed-in user is a 400, not a 401 that clients treat as an expired session."""

    def test_wrong_code_is_400(self):
        user = CradleUser.objects.create_user(username="tfa", password="tfaR1#1234112", email="t@b.c")
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        user.two_factor_enabled = True
        user.save(update_fields=["two_factor_enabled"])
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(user)}"}

        for name in ("user_2fa_verify", "user_2fa_disable"):
            with self.subTest(name=name):
                response = self.client.post(
                    reverse(name),
                    data=json.dumps({"otp": "000000", "password": "tfaR1#1234112"}),
                    content_type="application/json",
                    **headers,
                )
                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(response.json()["code"], "TWO_FACTOR_CODE_INCORRECT")

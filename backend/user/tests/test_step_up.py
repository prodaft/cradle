import json

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from ..models import CradleUser
from .utils import UserTestCase


class StepUpAuthTest(UserTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="userR1#1234112", email="a@b.c")
        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_delete_own_account_requires_password(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": "me"}),
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_delete_own_account_wrong_password(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": "me"}),
            data=json.dumps({"password": "wrong-password"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_delete_own_account_with_password(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": "me"}),
            data=json.dumps({"password": "userR1#1234112"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(CradleUser.objects.filter(username="user").exists())

    def test_generate_api_key_requires_password(self):
        response = self.client.post(
            reverse("user_api_key_me"),
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CURRENT_PASSWORD_INCORRECT")

    def test_generate_api_key_with_password(self):
        response = self.client.post(
            reverse("user_api_key_me"),
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

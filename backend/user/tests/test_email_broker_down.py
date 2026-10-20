"""Confirmation and reset emails when the message broker is unavailable."""

import json
from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone

from management.models import Setting
from user.testing import session_access_token

from ..models import CradleUser, UserRoles
from .utils import UserTestCase

BROKER_DOWN = patch("mail.models.send_email_task.delay", side_effect=ConnectionError("broker down"))


@BROKER_DOWN
class EmailBrokerDownTest(UserTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)  # the setting below is cached and would leak into later tests
        Setting.objects.create(key="users.require_email_confirmation", value=True)
        self.user = CradleUser.objects.create_user(username="user", password="userR1#1234112", email="user@example.com")

    def post(self, name, body, **extra):
        return self.client.post(reverse(name), data=json.dumps(body), content_type="application/json", **extra)

    def test_signup_succeeds_and_says_email_was_not_sent(self, _delay):
        response = self.post(
            "auth_signup", {"username": "newuser", "email": "new@example.com", "password": "NewUser1#23456789"}
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertIn("could not be sent", response.json()["detail"])
        self.assertTrue(CradleUser.objects.filter(username="newuser").exists())

    def test_password_reset_request_looks_the_same(self, _delay):
        known = self.post("auth_password_reset", {"email": "user@example.com"})
        unknown = self.post("auth_password_reset", {"email": "nobody@example.com"})

        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())

    def test_expired_confirmation_does_not_claim_a_resend(self, _delay):
        self.user.email_confirmation_token = "t"
        self.user.email_confirmation_token_expiry = timezone.now() - timedelta(hours=1)
        self.user.save()

        response = self.post("auth_email_confirm", {"token": "t"})

        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("could not be sent", str(response.content))

    def test_admin_resend_reports_503(self, _delay):
        admin = CradleUser.objects.create_user(
            username="admin", password="pw", email="ad@b.c", role=UserRoles.ADMIN, email_confirmed=True
        )
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}
        for name in ("user_confirmation_email", "user_password_reset_email"):
            with self.subTest(name=name):
                response = self.client.post(reverse(name, kwargs={"user_id": self.user.id}), **headers)
                self.assertEqual(response.status_code, 503, response.content)
                self.assertEqual(response.json()["code"], "EMAIL_DELIVERY_UNAVAILABLE")

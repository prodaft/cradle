from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from user.testing import session_access_token

from ..managers import hash_api_key
from ..models import CradleUser
from .utils import UserTestCase

API_KEY = "test-api-key"


class APIKeyAuthenticationTest(UserTestCase):
    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c", is_active=True)
        self.user.api_key = hash_api_key(API_KEY)
        self.user.save(update_fields=["api_key"])

    def test_valid_api_key_authenticates(self):
        response = self.client.get(reverse("user_detail_me"), HTTP_API_KEY=API_KEY)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "user")

    def test_invalid_api_key_rejected(self):
        response = self.client.get(reverse("user_detail_me"), HTTP_API_KEY="wrong-key")

        self.assertEqual(response.status_code, 401)

    def test_deactivated_user_api_key_rejected(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.get(reverse("user_detail_me"), HTTP_API_KEY=API_KEY)

        self.assertEqual(response.status_code, 401)

    def test_generated_key_is_stored_as_digest_and_authenticates(self):
        response = self.client.post(
            reverse("user_api_key", kwargs={"user_id": self.user.id}),
            data={"password": "user"},
            content_type="application/json",
            HTTP_COOKIE=f"access_token={session_access_token(self.user)}",
        )
        self.assertEqual(response.status_code, 201, response.content)
        key = response.json()["api_key"]

        self.user.refresh_from_db()
        self.assertEqual(self.user.api_key, hash_api_key(key))
        self.assertEqual(self.client.get(reverse("user_detail_me"), HTTP_API_KEY=key).status_code, 200)

    def test_bogus_key_costs_one_query_however_many_keys_exist(self):
        for i in range(20):
            CradleUser.objects.create_user(
                username=f"k{i}", password="p", email=f"k{i}@example.com", api_key=hash_api_key(f"key-{i}")
            )

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("user_detail_me"), HTTP_API_KEY="wrong-key")
        query_count = len(queries)  # read before another request clears the query log

        self.assertEqual(response.status_code, 401)
        self.assertEqual(query_count, 1)

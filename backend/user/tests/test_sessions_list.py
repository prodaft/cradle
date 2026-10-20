from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from user.testing import login_tokens

from ..models import CradleUser, UserSession
from .utils import UserTestCase


class UserSessionsListTest(UserTestCase):
    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(username="user", password="userR1#1234112", email="a@b.c")
        # Two login sessions, each a (refresh, access) token pair.
        self.current = login_tokens(self.user)
        self.other = login_tokens(self.user)

    def test_marks_current_session_without_writing(self):
        cookie = f"access_token={self.current[1]}; refresh_token={self.current[0]}"
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("user_sessions_list_me"), HTTP_COOKIE=cookie)

        self.assertEqual(response.status_code, 200)
        flags = {row["id"]: row["is_current"] for row in response.json()["results"]}
        current_id = str(UserSession.objects.get(refresh_token_jti=self.current[0]["jti"]).id)
        self.assertEqual([k for k, v in flags.items() if v], [current_id])
        self.assertEqual(len(flags), 2)
        writes = [q["sql"] for q in queries if q["sql"].lstrip().upper().startswith(("UPDATE", "INSERT", "DELETE"))]
        self.assertEqual(writes, [])

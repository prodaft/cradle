from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.parsers import JSONParser
import io

from ..converters import UserSerializer


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class DeleteUserTest(TestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@email.com", "admin")
        self.user = User.objects.create_user("user", password="user")

    def login_admin(self):
        self.client.login(username="admin", password="admin")

    def login_user(self):
        self.client.login(username="user", password="user")

    def test_delete_user_successfully(self):
        self.login_admin()

        response = self.client.delete(
            reverse("delete", kwargs={"user_id": self.user.id}), {}
        )

        self.assertEqual(response.status_code, 200)

    def test_delete_user_not_found(self):
        self.login_admin()

        response = self.client.delete(reverse("delete", kwargs={"user_id": 0}), {})

        self.assertEqual(response.status_code, 404)

    def test_delete_user_not_authenticated(self):
        response = self.client.delete(
            reverse("delete", kwargs={"user_id": self.user.id}), {}
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_user_not_authorized(self):
        self.login_user()

        response = self.client.delete(
            reverse("delete", kwargs={"user_id": self.user.id}), {}
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_user_cannot_remove_admin(self):
        self.login_admin()

        response = self.client.delete(
            reverse("delete", kwargs={"user_id": self.admin.id}), {}
        )

        self.assertEqual(response.status_code, 403)


class GetUsersTest(TestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@email.com", "admin")
        self.user = User.objects.create_user("user", password="user")

    def login_admin(self):
        self.client.login(username="admin", password="admin")

    def login_user(self):
        self.client.login(username="user", password="user")

    def test_get_users_successfully(self):
        self.login_admin()

        response = self.client.get(reverse("create/get-all"), {})

        self.assertEqual(response.status_code, 200)
        expected = UserSerializer([self.admin, self.user], many=True).data
        self.assertCountEqual(expected, bytes_to_json(response.content))

    def test_get_users_not_authenticated(self):
        response = self.client.get(reverse("create/get-all"), {})

        self.assertEqual(response.status_code, 401)

    def test_get_users_not_authorized(self):
        self.login_user()

        response = self.client.get(reverse("create/get-all"), {})

        self.assertEqual(response.status_code, 403)

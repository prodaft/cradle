from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User


def create_test_user(test_case):
    response_post = test_case.client.post(
        reverse("create"), {"username": "test", "password": "secret"}
    )
    test_case.assertEqual(response_post.status_code, 200)

    test_case.assertIsNotNone(User.objects.get(username="test"))


class UserTest(TestCase):
    def test_user_created(self):
        create_test_user(self)

    def test_user_is_logged(self):
        create_test_user(self)

        self.client.post(reverse("login"), {"username": "test", "password": "secret"})

        response_get = self.client.post(reverse("logout"))
        self.assertEqual(response_get.status_code, 200)

    def test_authenticate_user(self):
        create_test_user(self)

        response_login = self.client.post(
            reverse("login"), {"username": "test", "password": "secret"}
        )
        self.assertEqual(response_login.status_code, 200)

    def test_authenticate_user_wrong_credentials(self):
        create_test_user(self)

        response_login = self.client.post(
            reverse("login"), {"username": "test", "password": "wrong"}
        )
        self.assertEqual(response_login.status_code, 401)

    def test_user_is_not_logged(self):
        response_get = self.client.post(reverse("logout"))
        self.assertEqual(response_get.status_code, 302)

    def test_user_is_logged_out(self):
        create_test_user(self)

        self.client.post(reverse("login"), {"username": "test", "password": "secret"})

        self.client.login(usename="test", password="secret")

        response_logout = self.client.post(reverse("logout"))
        self.assertEqual(response_logout.status_code, 200)

        response_protected = self.client.get(reverse("logout"))
        self.assertEqual(response_protected.status_code, 302)

    def test_login_failed_view(self):
        create_test_user(self)

        response_unauthorized = self.client.get(reverse("unauthorized"))

        self.assertEqual(response_unauthorized.status_code, 401)

    def test_password_not_provided_create(self):
        response_create = self.client.post(reverse("create"), {"username": "test"})
        self.assertEqual(response_create.status_code, 400)

    def test_username_not_provided_create(self):
        response_create = self.client.post(reverse("create"), {"password": "test"})
        self.assertEqual(response_create.status_code, 400)

    def test_password_not_provided_login(self):
        response_create = self.client.post(reverse("login"), {"username": "test"})
        self.assertEqual(response_create.status_code, 400)

    def test_username_not_provided_login(self):
        response_create = self.client.post(reverse("login"), {"password": "test"})
        self.assertEqual(response_create.status_code, 400)

    def test_user_exists(self):
        create_test_user(self)

        response_post = self.client.post(
            reverse("create"), {"username": "test", "password": "secret"}
        )
        self.assertEqual(response_post.status_code, 409)

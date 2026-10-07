import json

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from ..models import BlacklistedToken, CradleUser, UserSession
from ..serializers import UserRetrieveSerializer
from .utils import UserTestCase


class CreateUserTest(UserTestCase):
    def create_user_request(self, username=None, password=None, email=None):
        create_user_dict = {}
        if username is not None:
            create_user_dict["username"] = username
        if password is not None:
            create_user_dict["password"] = password
        if email is not None:
            create_user_dict["email"] = email

        response = self.client.post(
            reverse("auth_signup"),
            data=json.dumps(create_user_dict),
            content_type="application/json",
        )
        return response

    def test_user_create_successfully(self):
        response = self.create_user_request("user", "userR1#1234112", email="alabala@gmail.com")
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(CradleUser.objects.get(username="user"))

    def test_user_create_same_email(self):
        self.create_user_request("user", "userR1#1234112", email="alabala@example.com")
        response = self.create_user_request("new_user", "userR1#12123412", email="alabala@example.com")
        self.assertEqual(response.status_code, 409)

        with self.assertRaises(CradleUser.DoesNotExist):
            CradleUser.objects.get(username="new_user")

    def test_user_create_no_username(self):
        response = self.create_user_request(username=None, password="user")
        self.assertEqual(response.status_code, 400)

    def test_user_create_no_password(self):
        response = self.create_user_request(username="user", password=None)
        self.assertEqual(response.status_code, 400)

    def test_user_create_validation_fails(self):
        response = self.create_user_request(username="user", password="abcd1234@")
        self.assertEqual(response.status_code, 400)

    def test_user_create_already_exists(self):
        self.create_user_request(username="user", password="userR1#1234112", email="alabala@gmail.com")
        response = self.create_user_request(username="user", password="userR1#1234112", email="alabal@gmail.com")
        self.assertEqual(response.status_code, 409)

    def test_user_create_no_email(self):
        response = self.create_user_request(username="user", password="userR1#1234112")
        self.assertEqual(response.status_code, 400)

    def test_user_create_email_invalid(self):
        emails = [
            "user@.com",
            "@example.com",
            "user@com",
            "user@example..com",
            "user@@example.com",
        ]
        for email in emails:
            with self.subTest(email):
                response = self.create_user_request(username="user", password="userR1#1234112", email=email)
                self.assertEqual(response.status_code, 400)

    def test_user_login_successfully(self):
        self.create_user_request("user", "userR1#1234112", email="alabala@gmail.com")
        response = self.client.post(
            reverse("auth_login"),
            data=json.dumps({"username": "user", "password": "userR1#1234112"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

    def test_user_login_sets_tokens_only_as_cookies(self):
        self.create_user_request("user", "userR1#1234112", email="alabala@gmail.com")
        response = self.client.post(
            reverse("auth_login"),
            data=json.dumps({"username": "user", "password": "userR1#1234112"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertEqual(response.data["user_id"], str(CradleUser.objects.get(username="user").id))
        self.assertTrue(response.cookies["access_token"]["httponly"])
        self.assertTrue(response.cookies["refresh_token"]["httponly"])

        me = self.client.get(reverse("user_detail_me"))
        self.assertEqual(me.status_code, 200)

    def test_rotated_refresh_token_is_rejected(self):
        self.create_user_request("user", "userR1#1234112", email="alabala@gmail.com")
        self.client.post(
            reverse("auth_login"),
            data=json.dumps({"username": "user", "password": "userR1#1234112"}),
            content_type="application/json",
        )
        old_refresh = self.client.cookies["refresh_token"].value

        response = self.client.post(reverse("auth_refresh"))
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(self.client.cookies["refresh_token"].value, old_refresh)

        self.client.cookies["refresh_token"] = old_refresh
        response = self.client.post(reverse("auth_refresh"))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "SESSION_RENEWAL_FAILED")

    def test_user_login_wrong_credentials(self):
        response = self.client.post(
            reverse("auth_login"),
            data=json.dumps({"username": "user", "password": "user"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_user_login_no_username(self):
        response = self.client.post(
            reverse("auth_login"),
            data=json.dumps({"password": "user"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_user_login_no_password(self):
        response = self.client.post(
            reverse("auth_login"),
            data=json.dumps({"username": "user"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)


class GetAllUsersTest(UserTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c")
        self.admin = CradleUser.objects.create_superuser(username="admin", password="admin", email="b@c.d")
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_COOKIE": f"access_token={self.token_admin}"}
        self.headers_normal = {"HTTP_COOKIE": f"access_token={self.token_normal}"}

    def test_get_all_users_successful(self):
        response = self.client.get(reverse("user_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)
        expected = UserRetrieveSerializer([self.admin, self.user], many=True).data
        self.assertCountEqual(expected, response.json()["results"])

    def test_get_all_users_not_authenticated(self):
        response = self.client.get(reverse("user_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_all_users_not_authorized(self):
        response = self.client.get(reverse("user_list"), **self.headers_normal)

        self.assertEqual(response.status_code, 403)


class SimulateUserTest(UserTestCase):
    def test_simulate_retires_admin_refresh_token_and_records_session(self):
        user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c")
        admin = CradleUser.objects.create_superuser(username="admin", password="admin", email="b@c.d")
        admin_refresh = RefreshToken.for_user(admin)
        self.client.cookies["access_token"] = str(admin_refresh.access_token)
        self.client.cookies["refresh_token"] = str(admin_refresh)

        response = self.client.post(reverse("user_manage", args=[user.id, "simulate"]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(BlacklistedToken.is_blacklisted(admin_refresh["jti"]))
        simulated_refresh = RefreshToken(response.cookies["refresh_token"].value)
        self.assertTrue(UserSession.objects.filter(user=user, refresh_token_jti=simulated_refresh["jti"]).exists())

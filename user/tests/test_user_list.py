from django.test import TestCase
from django.urls import reverse
from ..models.access_model import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..serializers import UserRetrieveSerializer
import io


class CreateUserTest(TestCase):
    def create_user_request(self, username=None, password=None):
        create_user_dict = {}
        if username is not None:
            create_user_dict["username"] = username
        if password is not None:
            create_user_dict["password"] = password

        response = self.client.post(reverse("user_list"), create_user_dict)
        return response

    def test_user_create_successfully(self):
        response = self.create_user_request("user", "user")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(CradleUser.objects.get(username="user"))

    def test_user_create_no_username(self):
        response = self.create_user_request(username=None, password="user")
        self.assertEqual(response.status_code, 400)

    def test_user_create_no_password(self):
        response = self.create_user_request(username="user", password=None)
        self.assertEqual(response.status_code, 400)

    def test_user_create_already_exists(self):
        self.create_user_request(username="user", password="user")
        response = self.create_user_request(username="user", password="user")
        self.assertEqual(response.status_code, 409)

    def test_user_login_successfully(self):
        self.create_user_request("user", "user")
        response = self.client.post(
            reverse("user_login"), {"username": "user", "password": "user"}
        )

        self.assertEqual(response.status_code, 200)

    def test_user_login_wrong_credentials(self):
        response = self.client.post(
            reverse("user_login"), {"username": "user", "password": "user"}
        )

        self.assertEqual(response.status_code, 401)

    def test_user_login_no_username(self):
        response = self.client.post(reverse("user_login"), {"password": "user"})

        self.assertEqual(response.status_code, 400)

    def test_user_login_no_password(self):
        response = self.client.post(reverse("user_login"), {"username": "user"})

        self.assertEqual(response.status_code, 400)


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetAllUsersTest(TestCase):

    def setUp(self):
        self.user = CradleUser.objects.create_user(username="user", password="user")
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="admin"
        )
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_get_all_users_successful(self):
        response = self.client.get(reverse("user_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)  # Actually verify the entities sent
        expected = UserRetrieveSerializer([self.admin, self.user], many=True).data
        self.assertCountEqual(expected, bytes_to_json(response.content))

    def test_get_all_users_not_authenticated(self):
        response = self.client.get(reverse("user_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_all_users_not_authorized(self):
        response = self.client.get(reverse("user_list"), **self.headers_normal)

        self.assertEqual(response.status_code, 403)

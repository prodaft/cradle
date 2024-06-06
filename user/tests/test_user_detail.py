from django.urls import reverse
from ..models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from .utils import UserTestCase


class DeleteUserTest(UserTestCase):

    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="user")
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="admin"
        )
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_delete_user_successfully(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)

    def test_delete_user_not_found(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": 0}), **self.headers_admin
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_user_not_authenticated(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_user_not_authorized(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.user.id}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_user_cannot_remove_admin(self):
        response = self.client.delete(
            reverse("user_detail", kwargs={"user_id": self.admin.id}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 403)

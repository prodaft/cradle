from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken
from .utils import EntitiesTestCase

from ..models import Entity
from ..enums import EntityType


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class DeleteCaseDetailsTest(EntitiesTestCase):

    def setUp(self):
        super().setUp()

        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_delete_case_admin(self):
        case = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        response = self.client.delete(
            reverse("case_detail", kwargs={"case_id": case.pk}), **self.headers_admin
        )

        self.assertEqual(response.status_code, 200)

    def test_delete_case_authenticated_not_admin(self):
        case = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        response = self.client.delete(
            reverse("case_detail", kwargs={"case_id": case.pk}), **self.headers_normal
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_case_not_authenticated(self):
        case = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        response = self.client.delete(
            reverse("case_detail", kwargs={"case_id": case.pk})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_case_admin_wrong_id(self):
        case = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        response = self.client.delete(
            reverse("case_detail", kwargs={"case_id": case.pk + 1}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

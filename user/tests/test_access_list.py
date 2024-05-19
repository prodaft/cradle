from django.test import TestCase
from django.urls import reverse
from ..models import CradleUser, AccessType, Access
from entities.models import Entity
from rest_framework.parsers import JSONParser
from rest_framework_simplejwt.tokens import AccessToken

import io

from entities.enums import EntityType


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class UpdateAccessTest(TestCase):

    def setUp(self):
        self.user = CradleUser.objects.create_user(username="user", password="pass")
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="pass"
        )
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.case, created = Entity.objects.get_or_create(
            name="Case 1", description="Cool case", type=EntityType.CASE
        )

    def test_access_list_success(self):
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.case.id), "name": "Case 1", "access_type": "none"}
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(data=response.content), expected_response)

    def test_access_list_not_admin(self):
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_access_list_admin(self):
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.admin.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.case.id), "name": "Case 1", "access_type": "read-write"}
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(data=response.content), expected_response)

    def test_access_list_not_authenticated(self):
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
        )

        self.assertEqual(response.status_code, 401)

    def test_access_list_access_already_there(self):
        Access.objects.create(
            user=self.user, case=self.case, access_type=AccessType.READ
        )
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.case.id), "name": "Case 1", "access_type": "read"}
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(data=response.content), expected_response)

    def test_access_list_multiple_cases(self):
        Access.objects.create(
            user=self.user, case=self.case, access_type=AccessType.READ
        )
        case2 = Entity.objects.create(name="Case 2", type=EntityType.CASE)

        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.case.id), "name": "Case 1", "access_type": "read"},
            {"id": str(case2.id), "name": "Case 2", "access_type": "none"},
        ]

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(bytes_to_json(data=response.content), expected_response)

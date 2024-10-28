from django.urls import reverse
from user.models import CradleUser
from ..models import Access
from ..enums import AccessType
from entries.models import Entry
from rest_framework.parsers import JSONParser
from rest_framework_simplejwt.tokens import AccessToken
from .utils import AccessTestCase

import io

from entries.enums import EntryType


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class AccessListTest(AccessTestCase):

    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="pass", email="alabala@gmail.com"
        )
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="pass", email="b@c.d"
        )
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.entity, created = Entry.objects.get_or_create(
            name="Entity 1", description="Cool entity", type=EntryType.ENTITY
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
            {"id": str(self.entity.id), "name": "Entity 1", "access_type": "none"}
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
            {"id": str(self.entity.id), "name": "Entity 1", "access_type": "read-write"}
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
            user=self.user, entity=self.entity, access_type=AccessType.READ
        )
        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.entity.id), "name": "Entity 1", "access_type": "read"}
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(data=response.content), expected_response)

    def test_access_list_multiple_entities(self):
        Access.objects.create(
            user=self.user, entity=self.entity, access_type=AccessType.READ
        )
        entity2 = Entry.objects.create(name="Entity 2", type=EntryType.ENTITY)

        response = self.client.get(
            reverse(
                "access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_response = [
            {"id": str(self.entity.id), "name": "Entity 1", "access_type": "read"},
            {"id": str(entity2.id), "name": "Entity 2", "access_type": "none"},
        ]

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(bytes_to_json(data=response.content), expected_response)

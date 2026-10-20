from django.urls import reverse

from entries.models import Entry
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import AccessType
from ..models import Access
from .utils import AccessTestCase


class AccessListTest(AccessTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user",
            password="pass",
            email="alabala@gmail.com",
            is_active=True,
        )
        self.admin = CradleUser.objects.create_superuser(username="admin", password="pass", email="b@c.d")
        self.token_admin = str(session_access_token(self.admin))
        self.token_normal = str(session_access_token(self.user))
        self.headers_admin = {"HTTP_COOKIE": f"access_token={self.token_admin}"}
        self.headers_normal = {"HTTP_COOKIE": f"access_token={self.token_normal}"}
        self.entity, created = Entry.objects.get_or_create(
            name="Entity 1", description="Cool entity", entry_class=self.entryclass1
        )

    def test_access_list_success(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [
            {
                "id": self.entity.id,
                "name": "Entity 1",
                "access_type": "none",
                "team_access_type": "none",
                "effective_access_type": "none",
            }
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_not_admin(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_access_list_admin(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.admin.id},
            ),
            **self.headers_admin,
        )

        expected_results = [
            {
                "id": self.entity.id,
                "name": "Entity 1",
                "access_type": "read-write",
                "team_access_type": "none",
                "effective_access_type": "read-write",
            }
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_not_authenticated(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
        )

        self.assertEqual(response.status_code, 401)

    def test_access_list_access_already_there(self):
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ)
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [
            {
                "id": self.entity.id,
                "name": "Entity 1",
                "access_type": "read",
                "team_access_type": "none",
                "effective_access_type": "read",
            }
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_multiple_entities(self):
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ)
        entity2 = Entry.objects.create(name="Entity 2", entry_class=self.entryclass1)

        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [
            {
                "id": self.entity.id,
                "name": "Entity 1",
                "access_type": "read",
                "team_access_type": "none",
                "effective_access_type": "read",
            },
            {
                "id": entity2.id,
                "name": "Entity 2",
                "access_type": "none",
                "team_access_type": "none",
                "effective_access_type": "none",
            },
        ]

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(response.json()["results"], expected_results)

    def test_entity_access_list_manager(self):
        manager = CradleUser.objects.create_user(
            username="manager", password="pass", email="m@c.d", role=UserRoles.MANAGER
        )
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(manager)}"}
        response = self.client.get(reverse("entity_access_list", kwargs={"entity_id": self.entity.id}), **headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.get(
            reverse("entity_access_list", kwargs={"entity_id": self.entity.id}), **self.headers_normal
        )
        self.assertEqual(response.status_code, 403)

    def test_user_access_list_search(self):
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ)
        Entry.objects.create(name="Other entity", entry_class=self.entryclass1)
        response_list = self.client.get(
            reverse("user_access_list", kwargs={"user_id": self.user.id}),
            {"search": "Entity 1", "page": "1", "page_size": "200"},
            **self.headers_admin,
        )
        self.assertEqual(response_list.status_code, 200)
        results = response_list.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Entity 1")

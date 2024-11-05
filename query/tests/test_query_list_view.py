from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry, EntryClass
from entries.enums import EntryType
from access.models import Access
from access.enums import AccessType
from notes.models import Note
from .utils import QueryTestCase


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class QueryListTest(QueryTestCase):
    def setUp(self):
        super().setUp()

        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", email="alabala@gmail.com"
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", email="b@c.d"
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.__init_database()

    def __init_database(self):
        self.entities = [
            Entry.objects.create(
                name=f"Entity {i}", description=f"{i}", entry_class=self.entryclass1
            )
            for i in range(0, 4)
        ]
        self.artifacts = []
        self.artifacts.append(
            Entry.objects.create(
                name="Artifact1",
                description="1",
                entry_class=self.entryclass_ip,
            )
        )
        self.artifacts.append(
            Entry.objects.create(
                name="3nTry2",
                description="2",
                entry_class=self.entryclass_country,
            )
        )

        Access.objects.create(
            user=self.normal_user,
            entity=self.entities[0],
            access_type=AccessType.READ_WRITE,
        )
        Access.objects.create(
            user=self.normal_user, entity=self.entities[1], access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.normal_user, entity=self.entities[2], access_type=AccessType.NONE
        )

        Entry.objects.create(
            name="Romania",
            entry_class=self.entryclass_country,
        )

        self.note = Note.objects.create(content="Note content")
        self.note.entries.add(self.artifacts[0], self.artifacts[1], self.entities[0])

    def test_query_not_authenticated(self):
        response = self.client.get(reverse("query_list"))

        self.assertEqual(response.status_code, 401)

    def test_query_shows_only_entries_with_access_admin(self):
        response = self.client.get(reverse("query_list"), **self.headers_admin)

        result = list(bytes_to_json(response.content))
        self.assertEqual(len(result), 7)

    def test_query_shows_only_entries_with_access_normal(self):
        response = self.client.get(reverse("query_list"), **self.headers_normal)

        result = list(bytes_to_json(response.content))
        self.assertEqual(len(result), 4)

    def test_query_filters_entries_based_on_subtype(self):
        query_params = {"entrySubtype": ["ip"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )
        result = list(bytes_to_json(response.content))

        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)

        with self.subTest("Correct subtype"):
            for entry in result:
                self.assertEqual(entry["subtype"], "ip")

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 200)

    def test_query_filters_entries_based_on_name(self):
        query_params = {"name": "Arti"}

        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )
        result = list(bytes_to_json(response.content))

        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)

        with self.subTest("Correct name"):
            for entry in result:
                self.assertTrue(entry["name"].startswith("Arti"))

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 200)

    def test_query_filters_invalid_params(self):
        query_params = {"entryType": ["arti"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 400)

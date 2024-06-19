from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from access.models import Access
from access.enums import AccessType
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
        self.cases = [
            Entity.objects.create(
                name=f"Case {i}", description=f"{i}", type=EntityType.CASE
            )
            for i in range(0, 4)
        ]
        self.entries = []
        self.entries.append(
            Entity.objects.create(
                name="Entry1",
                description="1",
                type=EntityType.ENTRY,
                subtype=EntitySubtype.IP,
            )
        )
        self.entries.append(
            Entity.objects.create(
                name="EnTry2",
                description="2",
                type=EntityType.ENTRY,
                subtype=EntitySubtype.PASSWORD,
            )
        )

        Access.objects.create(
            user=self.normal_user, case=self.cases[0], access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.normal_user, case=self.cases[1], access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.normal_user, case=self.cases[2], access_type=AccessType.NONE
        )

        Entity.objects.create(
            name="Romania", type=EntityType.METADATA, subtype=EntitySubtype.COUNTRY
        )

    def test_query_not_authenticated(self):
        response = self.client.get(reverse("query_list"))

        self.assertEqual(response.status_code, 401)

    def test_query_shows_only_entities_with_access_admin(self):
        response = self.client.get(reverse("query_list"), **self.headers_admin)

        result = list(bytes_to_json(response.content))
        self.assertEqual(len(result), 6)

    def test_query_shows_only_entities_with_access_normal(self):

        response = self.client.get(reverse("query_list"), **self.headers_normal)

        result = list(bytes_to_json(response.content))
        self.assertEqual(len(result), 4)

    def test_query_filters_entites_based_on_type(self):

        query_params = {"entityType": ["entry"]}

        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )
        result = list(bytes_to_json(response.content))
        with self.subTest("Correct amount"):
            self.assertEqual(len(result), 2)

        for entity in result:
            with self.subTest("Correct type"):
                self.assertEqual(entity["type"], "entry")
        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 200)

    def test_query_filters_entities_based_on_subtype(self):
        query_params = {"entityType": ["entry"], "entitySubtype": ["ip"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )
        result = list(bytes_to_json(response.content))

        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)

        with self.subTest("Correct subtype"):
            for entity in result:
                self.assertEqual(entity["subtype"], "ip")

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 200)

    def test_query_filters_entities_based_on_name(self):
        query_params = {"entityType": ["entry"], "name": "Entr"}

        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )
        result = list(bytes_to_json(response.content))

        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)

        with self.subTest("Correct name"):
            for entity in result:
                self.assertTrue(entity["name"].startswith("Entr"))

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 200)

    def test_query_filters_invalid_params(self):
        query_params = {"entityType": ["entr"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 400)

    def test_query_filters_invalid_params_contains_metadata(self):
        query_params = {"entityType": ["metadata", "case"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 400)

    def test_query_filters_invalid_params_contains_metadata_subtypes(self):
        query_params = {"entityType": ["entry"], "entitySubtype": ["ip", "country"]}
        response = self.client.get(
            reverse("query_list"), query_params, **self.headers_normal
        )

        with self.subTest("Status code"):
            self.assertEqual(response.status_code, 400)

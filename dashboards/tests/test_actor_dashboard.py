from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from .utils import DashboardsTestCase

from entities.models import Entity
from entities.enums import EntityType
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetActorDashboardTest(DashboardsTestCase):

    def check_ids(self, entities, entities_json):
        with self.subTest("Check number of entities"):
            self.assertEqual(len(entities), len(entities_json))

        self.assertCountEqual(
            [entity["id"] for entity in entities_json],
            [str(entity.id) for entity in entities],
        )

    def check_inaccessible_cases_name(self, inaccessible_cases):
        for case in inaccessible_cases:
            with self.subTest("Check case anonymous names"):
                self.assertEqual(case["name"], "Some Case")
                self.assertEqual(case["description"], "Some Description")

    def update_notes(self):
        self.note2.entities.add(self.actor1)

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.update_notes()

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("actor_dashboard", kwargs={"actor_name": self.actor1.name}),
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.all().order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE)
        actors = Entity.objects.filter(id=self.actor2.id)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.actor1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("actor_dashboard", kwargs={"actor_name": self.actor1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.filter(id=self.case1.id)
        actors = Entity.objects.none()
        metadata = Entity.objects.filter(id=self.metadata1.id)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.actor1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("actor_dashboard", kwargs={"actor_name": self.actor1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.all().order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE)
        actors = Entity.objects.filter(id=self.actor2.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.actor1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_no_access(self):
        response = self.client.get(
            reverse("actor_dashboard", kwargs={"actor_name": self.actor2.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.none()
        cases = Entity.objects.none()
        actors = Entity.objects.none()
        metadata = Entity.objects.none()
        inaccessible_cases = Entity.cases.order_by("-id")

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.actor2.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_invalid_actor(self):
        response = self.client.get(
            reverse("actor_dashboard", kwargs={"actor_name": "Case"}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

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


class GetCaseDashboardTest(DashboardsTestCase):

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

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE).filter(id=self.case2.id)
        actors = Entity.objects.filter(type=EntityType.ACTOR).exclude(id=self.actor3.id)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.objects.none()
        inaccessible_actors = Entity.objects.none()
        inaccessible_metadata = Entity.objects.none()
        inaccessible_entries = Entity.objects.none()
        second_hop_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.none()
        second_hop_inaccessible_actors = Entity.objects.none()
        second_hop_inaccessible_metadata = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read-write")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_entries, json_response["inaccessible_entries"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(second_hop_actors, json_response["second_hop_actors"])
        self.check_ids(second_hop_metadata, json_response["second_hop_metadata"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )
        self.check_ids(
            second_hop_inaccessible_actors,
            json_response["second_hop_inaccessible_actors"],
        )
        self.check_ids(
            second_hop_inaccessible_metadata,
            json_response["second_hop_inaccessible_metadata"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.none()
        actors = Entity.objects.filter(id=self.actor1.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entity.objects.none()
        inaccessible_entries = Entity.objects.filter(id=self.entry1.id)
        second_hop_cases = Entity.objects.none()
        second_hop_actors = Entity.objects.none()
        second_hop_metadata = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.none()
        second_hop_inaccessible_actors = Entity.objects.none()
        second_hop_inaccessible_metadata = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_entries, json_response["inaccessible_entries"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(second_hop_actors, json_response["second_hop_actors"])
        self.check_ids(second_hop_metadata, json_response["second_hop_metadata"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )
        self.check_ids(
            second_hop_inaccessible_actors,
            json_response["second_hop_inaccessible_actors"],
        )
        self.check_ids(
            second_hop_inaccessible_metadata,
            json_response["second_hop_inaccessible_metadata"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.objects.filter(id=self.case2.id)
        actors = Entity.actors.exclude(id=self.actor3.id)
        metadata = Entity.metadata.all()
        entries = Entity.entries.all()
        inaccessible_cases = Entity.objects.none()
        inaccessible_actors = Entity.objects.none()
        inaccessible_metadata = Entity.objects.none()
        inaccessible_entries = Entity.objects.none()
        second_hop_cases = Entity.objects.none()
        second_hop_actors = Entity.objects.none()
        second_hop_metadata = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_inaccessible_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_inaccessible_metadata = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_entries, json_response["inaccessible_entries"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(second_hop_actors, json_response["second_hop_actors"])
        self.check_ids(second_hop_metadata, json_response["second_hop_metadata"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )
        self.check_ids(
            second_hop_inaccessible_actors,
            json_response["second_hop_inaccessible_actors"],
        )
        self.check_ids(
            second_hop_inaccessible_metadata,
            json_response["second_hop_inaccessible_metadata"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_multiple_inaccessible(self):
        self.note2.entities.add(self.case3)

        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.none()
        actors = Entity.objects.filter(id=self.actor1.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()
        inaccessible_cases = Entity.cases.exclude(id=self.case1.id).order_by("id")
        inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entity.objects.none()
        inaccessible_entries = Entity.objects.filter(id=self.entry1.id)
        second_hop_cases = Entity.objects.none()
        second_hop_actors = Entity.objects.none()
        second_hop_metadata = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.none()
        second_hop_inaccessible_actors = Entity.objects.none()
        second_hop_inaccessible_metadata = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_entries, json_response["inaccessible_entries"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(second_hop_actors, json_response["second_hop_actors"])
        self.check_ids(second_hop_metadata, json_response["second_hop_metadata"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )
        self.check_ids(
            second_hop_inaccessible_actors,
            json_response["second_hop_inaccessible_actors"],
        )
        self.check_ids(
            second_hop_inaccessible_metadata,
            json_response["second_hop_inaccessible_metadata"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_no_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case2.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_case(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": "Case"}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

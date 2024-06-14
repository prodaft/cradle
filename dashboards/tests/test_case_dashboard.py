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
            [entity.id for entity in entities],
        )

    def check_inaccessible_cases_name(self, inaccessible_cases):
        for case in inaccessible_cases:
            with self.subTest("Check case anonymous names"):
                self.assertEqual(case["name"], "Some Case")
                self.assertEqual(case["description"], "Some Description")

    def update_notes(self):
        self.note3 = Note.objects.create(content="Note3")
        self.note3.entities.add(self.case3, self.actor2, self.metadata1)

    def update_cases(self):
        self.case3 = Entity.objects.create(
            name="Case3", description="Description3", type=EntityType.CASE
        )

    def setUp(self):
        super().setUp()

        self.client = APIClient()

        self.update_cases()
        self.update_notes()

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE).filter(id=self.case2.id)
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read-write")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])

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
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.objects.filter(id=self.case2.id)
        actors = Entity.actors.all()
        metadata = Entity.metadata.all()
        entries = Entity.entries.all()
        inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        self.assertEqual(json_response["access"], "read-write")
        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])

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
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.cases.exclude(id=self.case1.id).order_by("-id")

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(entries, json_response["entries"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])

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

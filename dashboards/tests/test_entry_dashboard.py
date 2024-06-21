from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from .utils import DashboardsTestCase

from entities.models import Entity
from entities.enums import EntityType, EntrySubtype
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetEntryDashboardTest(DashboardsTestCase):

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

        self.entry2 = Entity.objects.create(
            name="Entry2",
            description="Description2",
            type=EntityType.ENTRY,
            subtype=EntrySubtype.URL,
        )
        self.note1.entities.add(self.entry2)
        self.note2.entities.add(self.entry2)

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry2.name}),
            {"subtype": EntrySubtype.URL},
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.cases.exclude(id=self.case3.id)
        inaccessible_cases = Entity.objects.none()
        second_hop_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry2.name}),
            {"subtype": EntrySubtype.URL},
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.filter(id=self.case1.id)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        second_hop_cases = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry2.name}),
            {"subtype": EntrySubtype.URL},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        cases = Entity.cases.exclude(id=self.case3.id)
        inaccessible_cases = Entity.objects.none()
        second_hop_cases = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case3.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(second_hop_cases, json_response["second_hop_cases"])
        self.check_ids(
            second_hop_inaccessible_cases,
            json_response["second_hop_inaccessible_cases"],
        )

        self.check_inaccessible_cases_name(json_response["inaccessible_cases"])

    def test_get_dashboard_invalid_entry(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": "Case"}),
            {"subtype": EntrySubtype.IP},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_entry_subtype(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": "invalid"},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

    def test_get_dashboard_no_subtype_provided(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

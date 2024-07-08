from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io

from .utils import DashboardsTestCase
from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetCaseDashboardTest(DashboardsTestCase):

    def check_ids(self, entries, entries_json):
        with self.subTest("Check number of entries"):
            self.assertEqual(len(entries), len(entries_json))

        self.assertCountEqual(
            [entry["id"] for entry in entries_json],
            [str(entry.id) for entry in entries],
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
        cases = Entry.objects.filter(type=EntryType.CASE).filter(id=self.case2.id)
        actors = Entry.objects.filter(type=EntryType.ACTOR).exclude(id=self.actor3.id)
        metadata = Entry.objects.filter(type=EntryType.METADATA)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_cases = Entry.objects.none()
        inaccessible_actors = Entry.objects.none()
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_cases = Entry.objects.none()
        second_hop_inaccessible_actors = Entry.objects.none()
        second_hop_inaccessible_metadata = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read-write")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
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
        cases = Entry.objects.none()
        actors = Entry.objects.filter(id=self.actor1.id)
        metadata = Entry.objects.filter(id=self.metadata1.id)
        artifacts = Entry.objects.none()
        inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_cases = Entry.objects.none()
        second_hop_actors = Entry.objects.none()
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_cases = Entry.objects.none()
        second_hop_inaccessible_actors = Entry.objects.none()
        second_hop_inaccessible_metadata = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
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
        cases = Entry.objects.filter(id=self.case2.id)
        actors = Entry.actors.exclude(id=self.actor3.id)
        metadata = Entry.metadata.all()
        artifacts = Entry.artifacts.all()
        inaccessible_cases = Entry.objects.none()
        inaccessible_actors = Entry.objects.none()
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_cases = Entry.objects.none()
        second_hop_actors = Entry.objects.none()
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_inaccessible_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_inaccessible_metadata = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
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
        self.note2.entries.add(self.case3)

        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entry.objects.none()
        actors = Entry.objects.filter(id=self.actor1.id)
        metadata = Entry.objects.filter(id=self.metadata1.id)
        artifacts = Entry.objects.none()
        inaccessible_cases = Entry.cases.exclude(id=self.case1.id).order_by("id")
        inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_cases = Entry.objects.none()
        second_hop_actors = Entry.objects.none()
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_cases = Entry.objects.none()
        second_hop_inaccessible_actors = Entry.objects.none()
        second_hop_inaccessible_metadata = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], str(self.case1.id))

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(cases, json_response["cases"])
        self.check_ids(metadata, json_response["metadata"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(actors, json_response["actors"])
        self.check_ids(inaccessible_cases, json_response["inaccessible_cases"])
        self.check_ids(inaccessible_actors, json_response["inaccessible_actors"])
        self.check_ids(inaccessible_metadata, json_response["inaccessible_metadata"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
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

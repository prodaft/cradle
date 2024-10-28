from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from .utils import DashboardsTestCase

from entries.models import Entry
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetArtifactDashboardTest(DashboardsTestCase):
    def check_ids(self, entries, entries_json):
        with self.subTest("Check number of entries"):
            self.assertEqual(len(entries), len(entries_json))

        self.assertCountEqual(
            [entry["id"] for entry in entries_json],
            [str(entry.id) for entry in entries],
        )

    def check_inaccessible_entities_name(self, inaccessible_entities):
        for entity in inaccessible_entities:
            with self.subTest("Check entity anonymous names"):
                self.assertEqual(entity["name"], "Some Entity")
                self.assertEqual(entity["description"], "Some Description")

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.artifact2 = Entry.objects.create(
            name="Artifact2",
            description="Description2",
            entry_class=self.artifactclass2,
        )
        self.note1.entries.add(self.artifact2)
        self.note2.entries.add(self.artifact2)

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse(
                "artifact_dashboard", kwargs={"artifact_name": self.artifact2.name}
            ),
            {"subtype": "url"},
            **self.headers_admin,
        )
        print(response)
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.entities.exclude(id=self.entity3.id)
        inaccessible_entities = Entry.objects.none()
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_inaccessible_entities = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse(
                "artifact_dashboard", kwargs={"artifact_name": self.artifact2.name}
            ),
            {"subtype": "url"},
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        entities = Entry.objects.filter(id=self.entity1.id)
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse(
                "artifact_dashboard", kwargs={"artifact_name": self.artifact2.name}
            ),
            {"subtype": "url"},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.entities.exclude(id=self.entity3.id)
        inaccessible_entities = Entry.objects.none()
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity3.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("url", json_response["subtype"])

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_invalid_artifact(self):
        response = self.client.get(
            reverse("artifact_dashboard", kwargs={"artifact_name": "Entity"}),
            {"subtype": ArtifactSubtype.IP},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_artifact_subtype(self):
        response = self.client.get(
            reverse(
                "artifact_dashboard", kwargs={"artifact_name": self.artifact1.name}
            ),
            {"subtype": "invalid"},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

    def test_get_dashboard_no_subtype_provided(self):
        response = self.client.get(
            reverse(
                "artifact_dashboard", kwargs={"artifact_name": self.artifact1.name}
            ),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

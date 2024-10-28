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


class GetEntityDashboardTest(DashboardsTestCase):

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

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": self.entity1.name}),
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.objects.filter(type=EntryType.ENTITY).filter(id=self.entity2.id)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_entities = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check entity id"):
            self.assertEqual(json_response["id"], str(self.entity1.id))

        with self.subTest("Check entity access"):
            self.assertEqual(json_response["access"], "read-write")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(second_hop_metadata, json_response["second_hop_metadata"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": self.entity1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        entities = Entry.objects.none()
        artifacts = Entry.objects.none()
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check entity id"):
            self.assertEqual(json_response["id"], str(self.entity1.id))

        with self.subTest("Check entity access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": self.entity1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.objects.filter(id=self.entity2.id)
        artifacts = Entry.artifacts.all()
        inaccessible_entities = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity3.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check entity id"):
            self.assertEqual(json_response["id"], str(self.entity1.id))

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_multiple_inaccessible(self):
        self.note2.entries.add(self.entity3)

        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": self.entity1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        entities = Entry.objects.none()
        artifacts = Entry.objects.none()
        inaccessible_entities = Entry.entities.exclude(id=self.entity1.id).order_by("id")
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.none()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check entity id"):
            self.assertEqual(json_response["id"], str(self.entity1.id))

        with self.subTest("Check entity access"):
            self.assertEqual(json_response["access"], "read")

        self.check_ids(notes, json_response["notes"])
        self.check_ids(entities, json_response["entities"])
        self.check_ids(artifacts, json_response["artifacts"])
        self.check_ids(inaccessible_entities, json_response["inaccessible_entities"])
        self.check_ids(inaccessible_artifacts, json_response["inaccessible_artifacts"])
        self.check_ids(second_hop_entities, json_response["second_hop_entities"])
        self.check_ids(
            second_hop_inaccessible_entities,
            json_response["second_hop_inaccessible_entities"],
        )

        self.check_inaccessible_entities_name(json_response["inaccessible_entities"])

    def test_get_dashboard_user_no_access(self):
        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": self.entity2.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_entity(self):
        response = self.client.get(
            reverse("entity_dashboard", kwargs={"entity_name": "Entity"}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

from unittest.mock import patch, PropertyMock

import json
from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note
from ..serializers import (
    NoteDashboardSerializer,
    EntityDashboardSerializer,
    ArtifactDashboardSerializer,
)
from .utils import DashboardsTestCase


class NoteDashboardSerializersTest(DashboardsTestCase):
    def update_notes(self):
        self.note1 = Note.objects.create(content="a" * 1000)

        self.note2 = Note.objects.create(content="Note2")

    def setUp(self):
        super().setUp()

        self.update_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_note_is_shortened(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        expected = {
            "id": str(self.note1.id),
            "content": "a" * 200 + "...",
            "publishable": False,
            "timestamp": "2024-01-01T00:00:00Z",
            "files": [],
        }

        self.assertEqual(expected, NoteDashboardSerializer(self.note1).data)

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_note_is_the_same(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        expected = {
            "id": str(self.note2.id),
            "content": "Note2",
            "publishable": False,
            "timestamp": "2024-01-01T00:00:00Z",
            "files": [],
        }

        self.assertEqual(expected, NoteDashboardSerializer(self.note2).data)


class EntityDashboardSerializerTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_entity_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        entities = Entry.objects.filter(entry_class__type=EntryType.ENTITY)
        artifacts = Entry.objects.filter(entry_class__type=EntryType.ARTIFACT)
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity2.id)

        expected_json = {
            "id": str(self.entity1.id),
            "name": "Entity1",
            "description": "Description1",
            "type": "entity",
            "subtype": "case",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
                {
                    "id": str(self.note3.id),
                    "content": "Note3",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
            ],
            "entities": [
                {
                    "id": str(self.entity1.id),
                    "name": "Entity1",
                    "description": "Description1",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
                {
                    "id": str(self.entity2.id),
                    "name": "Entity2",
                    "description": "Description2",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
            ],
            "artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Artifact1",
                    "description": "Description1",
                    "type": "artifact",
                    "subtype": "ip",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "inaccessible_artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Some Artifact",
                    "description": "Some Description",
                    "type": "artifact",
                    "subtype": "ip",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "second_hop_entities": [
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "second_hop_inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "access": "read-write",
        }

        entries_dict = {
            "id": self.entity1.id,
            "name": self.entity1.name,
            "description": self.entity1.description,
            "type": self.entity1.entry_class.type,
            "subtype": self.entity1.entry_class.subtype,
            "notes": notes,
            "entities": entities,
            "artifacts": artifacts,
            "inaccessible_entities": inaccessible_entities,
            "inaccessible_artifacts": inaccessible_artifacts,
            "second_hop_entities": second_hop_entities,
            "second_hop_inaccessible_entities": second_hop_inaccessible_entities,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.entity3.id)] = [self.artifact1]
        neighbor_map[str(self.entity2.id)] = [self.artifact1]

        dashboard_json = EntityDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data
        self.maxDiff = None

        self.assertEqual(expected_json, dashboard_json)


class ArtifactDashboardSerializerTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()

        self.artifact2 = Entry.objects.create(
            name="Artifact2",
            description="Description2",
            entry_class=self.artifactclass2,
        )
        self.note1.entries.add(self.artifact2)
        self.note2.entries.add(self.artifact2)

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_artifact_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        entities = Entry.objects.filter(entry_class__type=EntryType.ENTITY)
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity2.id)

        expected_json = {
            "id": str(self.artifact2.id),
            "name": "Artifact2",
            "description": "Description2",
            "type": "artifact",
            "subtype": "url",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
                {
                    "id": str(self.note3.id),
                    "content": "Note3",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "files": [],
                },
            ],
            "entities": [
                {
                    "id": str(self.entity1.id),
                    "name": "Entity1",
                    "description": "Description1",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
                {
                    "id": str(self.entity2.id),
                    "name": "Entity2",
                    "description": "Description2",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                },
            ],
            "inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "second_hop_entities": [
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
            "second_hop_inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "case",
                    "regex": "",
                    "options": "",
                    "color": "#e66100",
                    "catalyst_type": "",
                }
            ],
        }

        entries_dict = {
            "id": str(self.artifact2.id),
            "name": self.artifact2.name,
            "description": self.artifact2.description,
            "type": self.artifact2.entry_class.type,
            "subtype": self.artifact2.entry_class.subtype,
            "notes": notes,
            "entities": entities,
            "inaccessible_entities": inaccessible_entities,
            "second_hop_entities": second_hop_entities,
            "second_hop_inaccessible_entities": second_hop_inaccessible_entities,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.entity3.id)] = [self.artifact1]
        neighbor_map[str(self.entity2.id)] = [self.artifact1]

        dashboard_json = ArtifactDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)

from unittest.mock import patch, PropertyMock

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
            "entries": [
                {
                    "id": str(self.entity1.id),
                    "name": "Entity1",
                    "type": "entity",
                },
                {},
            ],
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
            "entries": [
                {
                    "id": str(self.entity2.id),
                    "name": "Entity2",
                    "type": "entity",
                },
                {},
            ],
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
        entities = Entry.objects.filter(type=EntryType.ENTITY)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        second_hop_inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)

        expected_json = {
            "id": str(self.entity1.id),
            "name": "Entity1",
            "description": "Description1",
            "type": "entity",
            "subtype": "",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entries": [
                        {
                            "id": str(self.entity1.id),
                            "name": "Entity1",
                            "type": "entity",
                            "subtype": "",
                        }
                    ],
                    "files": [],
                },
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entries": [
                        {
                            "id": str(self.entity1.id),
                            "name": "Entity1",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entity2.id),
                            "name": "Entity2",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "type": "artifact",
                            "subtype": "ip",
                        },
                    ],
                    "files": [],
                },
                {
                    "id": str(self.note3.id),
                    "content": "Note3",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entries": [
                        {
                            "id": str(self.entity3.id),
                            "name": "Entity3",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "type": "artifact",
                            "subtype": "ip",
                        },
                        {
                            "id": str(self.metadata1.id),
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                    ],
                    "files": [],
                },
            ],
            "entities": [
                {
                    "id": str(self.entity1.id),
                    "name": "Entity1",
                    "description": "Description1",
                    "type": "entity",
                    "subtype": "",
                },
                {
                    "id": str(self.entity2.id),
                    "name": "Entity2",
                    "description": "Description2",
                    "type": "entity",
                    "subtype": "",
                },
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "",
                },
            ],
            "metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Metadata1",
                    "description": "Description1",
                    "type": "metadata",
                    "subtype": "",
                }
            ],
            "artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Artifact1",
                    "description": "Description1",
                    "type": "artifact",
                    "subtype": "ip",
                }
            ],
            "inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "",
                }
            ],
            "inaccessible_metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Some Metadata",
                    "description": "Some Description",
                    "type": "metadata",
                    "subtype": "",
                }
            ],
            "inaccessible_artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Some Artifact",
                    "description": "Some Description",
                    "type": "artifact",
                    "subtype": "ip",
                }
            ],
            "second_hop_entities": [
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "access": "read-write",
        }

        entries_dict = {
            "id": self.entity1.id,
            "name": self.entity1.name,
            "description": self.entity1.description,
            "type": self.entity1.type,
            "subtype": self.entity1.subtype,
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
        neighbor_map[str(self.metadata1.id)] = [self.artifact1]
        neighbor_map[str(self.entity2.id)] = [self.artifact1]

        dashboard_json = EntityDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

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
        entities = Entry.objects.filter(type=EntryType.ENTITY)
        inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity2.id)
        second_hop_inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)

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
                    "entries": [
                        {
                            "id": str(self.entity1.id),
                            "name": "Entity1",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "subtype": "",
                        },
                        {
                            "id": str(self.metadata1.id),
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                        {
                            "id": str(self.artifact2.id),
                            "name": "Artifact2",
                            "type": "artifact",
                            "subtype": "url",
                        },
                    ],
                    "files": [],
                },
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entries": [
                        {
                            "id": str(self.entity1.id),
                            "name": "Entity1",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entity2.id),
                            "name": "Entity2",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "subtype": "",
                        },
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "type": "artifact",
                            "subtype": "ip",
                        },
                        {
                            "id": str(self.artifact2.id),
                            "name": "Artifact2",
                            "type": "artifact",
                            "subtype": "url",
                        },
                    ],
                    "files": [],
                },
                {
                    "id": str(self.note3.id),
                    "content": "Note3",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entries": [
                        {
                            "id": str(self.entity3.id),
                            "name": "Entity3",
                            "type": "entity",
                            "subtype": "",
                        },
                        {
                            "subtype": "",
                        },
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "type": "artifact",
                            "subtype": "ip",
                        },
                        {
                            "id": str(self.metadata1.id),
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                    ],
                    "files": [],
                },
            ],
            "entities": [
                {
                    "id": str(self.entity1.id),
                    "name": "Entity1",
                    "description": "Description1",
                    "type": "entity",
                    "subtype": "",
                },
                {
                    "id": str(self.entity2.id),
                    "name": "Entity2",
                    "description": "Description2",
                    "type": "entity",
                    "subtype": "",
                },
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "",
                },
            ],
            "inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "",
                }
            ],
            "second_hop_entities": [
                {
                    "id": str(self.entity3.id),
                    "name": "Entity3",
                    "description": "Description3",
                    "type": "entity",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_entities": [
                {
                    "id": str(self.entity2.id),
                    "name": "Some Entity",
                    "description": "Some Description",
                    "type": "entity",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
        }

        entries_dict = {
            "id": str(self.artifact2.id),
            "name": self.artifact2.name,
            "description": self.artifact2.description,
            "type": self.artifact2.type,
            "notes": notes,
            "entities": entities,
            "inaccessible_entities": inaccessible_entities,
            "inaccessible_metadata": inaccessible_metadata,
            "second_hop_entities": second_hop_entities,
            "second_hop_metadata": second_hop_metadata,
            "second_hop_inaccessible_entities": second_hop_inaccessible_entities,
            "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.entity3.id)] = [self.artifact1]
        neighbor_map[str(self.metadata1.id)] = [self.artifact1]
        neighbor_map[str(self.entity2.id)] = [self.artifact1]

        dashboard_json = ArtifactDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)

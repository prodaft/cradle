from unittest.mock import patch, PropertyMock

from entities.models import Entity
from entities.enums import EntityType, EntrySubtype
from notes.models import Note
from ..serializers import (
    NoteDashboardSerializer,
    CaseDashboardSerializer,
    ActorDashboardSerializer,
    EntryDashboardSerializer,
)
from .utils import DashboardsTestCase


class NoteDashboardSerializersTest(DashboardsTestCase):

    def create_notes(self):
        self.note1 = Note.objects.create(content="a" * 1000)
        self.note1.entities.add(self.case1, self.actor1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def setUp(self):
        super().setUp()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_note_is_shortened(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        expected = {
            "id": self.note1.id,
            "content": "a" * 200 + "...",
            "publishable": False,
            "timestamp": "2024-01-01T00:00:00Z",
            "entities": [
                {
                    "id": self.case1.id,
                    "name": "Case1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": self.actor1.id,
                    "name": "Actor1",
                    "type": "actor",
                    "subtype": "",
                },
            ],
        }

        self.assertEqual(expected, NoteDashboardSerializer(self.note1).data)

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_note_is_the_same(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        expected = {
            "id": self.note2.id,
            "content": "Note2",
            "publishable": False,
            "timestamp": "2024-01-01T00:00:00Z",
            "entities": [
                {
                    "id": self.case2.id,
                    "name": "Case2",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": self.actor2.id,
                    "name": "Actor2",
                    "type": "actor",
                    "subtype": "",
                },
            ],
        }

        self.assertEqual(expected, NoteDashboardSerializer(self.note2).data)


class CaseDashboardSerializerTest(DashboardsTestCase):

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.add(self.case1, self.actor1, self.metadata1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def setUp(self):
        super().setUp()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_case_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(type=EntityType.CASE)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)

        expected_json = {
            "id": self.case1.id,
            "name": "Case1",
            "description": "Description1",
            "type": "case",
            "subtype": "",
            "notes": [
                {
                    "id": self.note1.id,
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": self.case1.id,
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": self.actor1.id,
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": self.metadata1.id,
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                    ],
                },
                {
                    "id": self.note2.id,
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": self.case1.id,
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": self.case2.id,
                            "name": "Case2",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": self.actor2.id,
                            "name": "Actor2",
                            "type": "actor",
                            "subtype": "",
                        },
                    ],
                },
            ],
            "actors": [
                {
                    "id": self.actor1.id,
                    "name": "Actor1",
                    "description": "Description1",
                    "type": "actor",
                    "subtype": "",
                },
                {
                    "id": self.actor2.id,
                    "name": "Actor2",
                    "description": "Description2",
                    "type": "actor",
                    "subtype": "",
                },
            ],
            "cases": [
                {
                    "id": self.case1.id,
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": self.case2.id,
                    "name": "Case2",
                    "description": "Description2",
                    "type": "case",
                    "subtype": "",
                },
            ],
            "metadata": [
                {
                    "id": self.metadata1.id,
                    "name": "Metadata1",
                    "description": "Description1",
                    "type": "metadata",
                    "subtype": "",
                }
            ],
            "entries": [],
            "access": "read-write",
        }

        entities_dict = {
            "id": self.case1.id,
            "name": self.case1.name,
            "description": self.case1.description,
            "type": self.case1.type,
            "subtype": self.case1.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "entries": entries,
            "access": "read-write",
        }

        dashboard_json = CaseDashboardSerializer(entities_dict).data

        self.assertEqual(expected_json, dashboard_json)


class ActorDashboardSerializerTest(DashboardsTestCase):

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.add(self.case1, self.actor1, self.metadata1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def setUp(self):
        super().setUp()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_actor_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.filter(id=self.note1.id)
        actors = Entity.objects.none()
        cases = Entity.objects.filter(id=self.case1.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()

        expected_json = {
            "id": self.actor1.id,
            "name": "Actor1",
            "description": "Description1",
            "type": "actor",
            "subtype": "",
            "notes": [
                {
                    "id": self.note1.id,
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": self.case1.id,
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": self.actor1.id,
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": self.metadata1.id,
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                    ],
                },
            ],
            "actors": [],
            "cases": [
                {
                    "id": self.case1.id,
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
            ],
            "metadata": [
                {
                    "id": self.metadata1.id,
                    "name": "Metadata1",
                    "description": "Description1",
                    "type": "metadata",
                    "subtype": "",
                }
            ],
        }

        entities_dict = {
            "id": self.actor1.id,
            "name": self.actor1.name,
            "description": self.actor1.description,
            "type": self.actor1.type,
            "subtype": self.actor1.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "entries": entries,
            "access": "read-write",
        }

        dashboard_json = ActorDashboardSerializer(entities_dict).data

        self.assertEqual(expected_json, dashboard_json)


class EntryDashboardSerializerTest(DashboardsTestCase):

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.add(self.case1, self.actor1, self.metadata1, self.entry1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def create_entries(self):
        self.entry1 = Entity.objects.create(
            name="Entry1",
            description="Description1",
            type=EntityType.ENTRY,
            subtype=EntrySubtype.IP,
        )

    def setUp(self):
        super().setUp()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_entries()

        self.create_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_actor_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.filter(id=self.note1.id)
        actors = Entity.objects.none()
        cases = Entity.objects.filter(id=self.case1.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()

        expected_json = {
            "id": self.entry1.id,
            "name": "Entry1",
            "description": "Description1",
            "type": "entry",
            "subtype": "ip",
            "notes": [
                {
                    "id": self.note1.id,
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": self.case1.id,
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": self.actor1.id,
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": self.metadata1.id,
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                        {
                            "id": self.entry1.id,
                            "name": "Entry1",
                            "type": "entry",
                            "subtype": "ip",
                        },
                    ],
                },
            ],
            "cases": [
                {
                    "id": self.case1.id,
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
            ],
        }

        entities_dict = {
            "id": self.entry1.id,
            "name": self.entry1.name,
            "description": self.entry1.description,
            "type": self.entry1.type,
            "subtype": self.entry1.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "entries": entries,
            "access": "read-write",
        }

        dashboard_json = EntryDashboardSerializer(entities_dict).data

        self.assertEqual(expected_json, dashboard_json)

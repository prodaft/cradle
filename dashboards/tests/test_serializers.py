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

    def update_notes(self):
        self.note1 = Note.objects.create(content="a" * 1000)
        self.note1.entities.add(self.case1, self.actor1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2)

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
            "entities": [
                {
                    "id": str(self.case1.id),
                    "name": "Case1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.actor1.id),
                    "name": "Actor1",
                    "type": "actor",
                    "subtype": "",
                },
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
            "entities": [
                {
                    "id": str(self.case2.id),
                    "name": "Case2",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.actor2.id),
                    "name": "Actor2",
                    "type": "actor",
                    "subtype": "",
                },
            ],
            "files": [],
        }

        self.assertEqual(expected, NoteDashboardSerializer(self.note2).data)


class CaseDashboardSerializerTest(DashboardsTestCase):

    def setUp(self):
        super().setUp()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_case_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(type=EntityType.CASE)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)
        inaccessible_entries = Entity.objects.filter(id=self.entry1.id)
        second_hop_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entity.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        second_hop_inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)

        expected_json = {
            "id": str(self.case1.id),
            "name": "Case1",
            "description": "Description1",
            "type": "case",
            "subtype": "",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor1.id),
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
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
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.case2.id),
                            "name": "Case2",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor2.id),
                            "name": "Actor2",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
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
                    "entities": [
                        {
                            "id": str(self.case3.id),
                            "name": "Case3",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor3.id),
                            "name": "Actor3",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
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
            "actors": [
                {
                    "id": str(self.actor1.id),
                    "name": "Actor1",
                    "description": "Description1",
                    "type": "actor",
                    "subtype": "",
                },
                {
                    "id": str(self.actor2.id),
                    "name": "Actor2",
                    "description": "Description2",
                    "type": "actor",
                    "subtype": "",
                },
                {
                    "id": str(self.actor3.id),
                    "name": "Actor3",
                    "description": "Description3",
                    "type": "actor",
                    "subtype": "",
                },
            ],
            "cases": [
                {
                    "id": str(self.case1.id),
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case2.id),
                    "name": "Case2",
                    "description": "Description2",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
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
            "entries": [
                {
                    "id": str(self.entry1.id),
                    "name": "Entry1",
                    "description": "Description1",
                    "type": "entry",
                    "subtype": "ip",
                }
            ],
            "inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                }
            ],
            "inaccessible_actors": [
                {
                    "id": str(self.actor2.id),
                    "name": "Some Actor",
                    "description": "Some Description",
                    "type": "actor",
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
            "inaccessible_entries": [
                {
                    "id": str(self.entry1.id),
                    "name": "Some Entry",
                    "description": "Some Description",
                    "type": "entry",
                    "subtype": "ip",
                }
            ],
            "second_hop_cases": [
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_actors": [
                {
                    "id": str(self.actor3.id),
                    "name": "Actor3",
                    "description": "Description3",
                    "type": "actor",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Metadata1",
                    "description": "Description1",
                    "type": "metadata",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_actors": [
                {
                    "id": str(self.actor2.id),
                    "name": "Some Actor",
                    "description": "Some Description",
                    "type": "actor",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Some Metadata",
                    "description": "Some Description",
                    "type": "metadata",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
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
            "inaccessible_cases": inaccessible_cases,
            "inaccessible_actors": inaccessible_actors,
            "inaccessible_metadata": inaccessible_metadata,
            "inaccessible_entries": inaccessible_entries,
            "second_hop_cases": second_hop_cases,
            "second_hop_actors": second_hop_actors,
            "second_hop_metadata": second_hop_metadata,
            "second_hop_inaccessible_cases": second_hop_inaccessible_cases,
            "second_hop_inaccessible_actors": second_hop_inaccessible_actors,
            "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.case3.id)] = [self.entry1]
        neighbor_map[str(self.actor3.id)] = [self.entry1]
        neighbor_map[str(self.metadata1.id)] = [self.entry1]
        neighbor_map[str(self.case2.id)] = [self.entry1]
        neighbor_map[str(self.actor2.id)] = [self.entry1]

        dashboard_json = CaseDashboardSerializer(
            entities_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)


class ActorDashboardSerializerTest(DashboardsTestCase):

    def setUp(self):
        super().setUp()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_actor_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(type=EntityType.CASE)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)
        second_hop_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entity.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        second_hop_inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)

        expected_json = {
            "id": str(self.actor1.id),
            "name": "Actor1",
            "description": "Description1",
            "type": "actor",
            "subtype": "",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor1.id),
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
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
                {
                    "id": str(self.note2.id),
                    "content": "Note2",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.case2.id),
                            "name": "Case2",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor2.id),
                            "name": "Actor2",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
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
                    "entities": [
                        {
                            "id": str(self.case3.id),
                            "name": "Case3",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor3.id),
                            "name": "Actor3",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
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
            "actors": [
                {
                    "id": str(self.actor1.id),
                    "name": "Actor1",
                    "description": "Description1",
                    "type": "actor",
                    "subtype": "",
                },
                {
                    "id": str(self.actor2.id),
                    "name": "Actor2",
                    "description": "Description2",
                    "type": "actor",
                    "subtype": "",
                },
                {
                    "id": str(self.actor3.id),
                    "name": "Actor3",
                    "description": "Description3",
                    "type": "actor",
                    "subtype": "",
                },
            ],
            "cases": [
                {
                    "id": str(self.case1.id),
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case2.id),
                    "name": "Case2",
                    "description": "Description2",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
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
            "inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                }
            ],
            "inaccessible_actors": [
                {
                    "id": str(self.actor2.id),
                    "name": "Some Actor",
                    "description": "Some Description",
                    "type": "actor",
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
            "second_hop_cases": [
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_actors": [
                {
                    "id": str(self.actor3.id),
                    "name": "Actor3",
                    "description": "Description3",
                    "type": "actor",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Metadata1",
                    "description": "Description1",
                    "type": "metadata",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_actors": [
                {
                    "id": str(self.actor2.id),
                    "name": "Some Actor",
                    "description": "Some Description",
                    "type": "actor",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_metadata": [
                {
                    "id": str(self.metadata1.id),
                    "name": "Some Metadata",
                    "description": "Some Description",
                    "type": "metadata",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
        }

        entities_dict = {
            "id": str(self.actor1.id),
            "name": self.actor1.name,
            "description": self.actor1.description,
            "type": self.actor1.type,
            "subtype": self.actor1.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "inaccessible_cases": inaccessible_cases,
            "inaccessible_actors": inaccessible_actors,
            "inaccessible_metadata": inaccessible_metadata,
            "second_hop_cases": second_hop_cases,
            "second_hop_actors": second_hop_actors,
            "second_hop_metadata": second_hop_metadata,
            "second_hop_inaccessible_cases": second_hop_inaccessible_cases,
            "second_hop_inaccessible_actors": second_hop_inaccessible_actors,
            "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.case3.id)] = [self.entry1]
        neighbor_map[str(self.actor3.id)] = [self.entry1]
        neighbor_map[str(self.metadata1.id)] = [self.entry1]
        neighbor_map[str(self.case2.id)] = [self.entry1]
        neighbor_map[str(self.actor2.id)] = [self.entry1]

        dashboard_json = ActorDashboardSerializer(
            entities_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)


class EntryDashboardSerializerTest(DashboardsTestCase):

    def setUp(self):
        super().setUp()

        self.entry2 = Entity.objects.create(
            name="Entry2",
            description="Description2",
            type=EntityType.ENTRY,
            subtype=EntrySubtype.URL,
        )
        self.note1.entities.add(self.entry2)
        self.note2.entities.add(self.entry2)

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_entry_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(type=EntityType.CASE)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)
        second_hop_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entity.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entity.objects.filter(id=self.actor2.id)
        second_hop_inaccessible_metadata = Entity.objects.filter(id=self.metadata1.id)

        expected_json = {
            "id": str(self.entry2.id),
            "name": "Entry2",
            "description": "Description2",
            "type": "entry",
            "subtype": "url",
            "notes": [
                {
                    "id": str(self.note1.id),
                    "content": "Note1",
                    "publishable": False,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor1.id),
                            "name": "Actor1",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.metadata1.id),
                            "name": "Metadata1",
                            "type": "metadata",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry2.id),
                            "name": "Entry2",
                            "type": "entry",
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
                    "entities": [
                        {
                            "id": str(self.case1.id),
                            "name": "Case1",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.case2.id),
                            "name": "Case2",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor2.id),
                            "name": "Actor2",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
                            "subtype": "ip",
                        },
                        {
                            "id": str(self.entry2.id),
                            "name": "Entry2",
                            "type": "entry",
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
                    "entities": [
                        {
                            "id": str(self.case3.id),
                            "name": "Case3",
                            "type": "case",
                            "subtype": "",
                        },
                        {
                            "id": str(self.actor3.id),
                            "name": "Actor3",
                            "type": "actor",
                            "subtype": "",
                        },
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "type": "entry",
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
            "cases": [
                {
                    "id": str(self.case1.id),
                    "name": "Case1",
                    "description": "Description1",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case2.id),
                    "name": "Case2",
                    "description": "Description2",
                    "type": "case",
                    "subtype": "",
                },
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
                    "subtype": "",
                },
            ],
            "inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                }
            ],
            "second_hop_cases": [
                {
                    "id": str(self.case3.id),
                    "name": "Case3",
                    "description": "Description3",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
            "second_hop_inaccessible_cases": [
                {
                    "id": str(self.case2.id),
                    "name": "Some Case",
                    "description": "Some Description",
                    "type": "case",
                    "subtype": "",
                    "neighbor": [
                        {
                            "id": str(self.entry1.id),
                            "name": "Entry1",
                            "description": "Description1",
                            "type": "entry",
                            "subtype": "ip",
                        }
                    ],
                }
            ],
        }

        entities_dict = {
            "id": str(self.entry2.id),
            "name": self.entry2.name,
            "description": self.entry2.description,
            "type": self.entry2.type,
            "subtype": self.entry2.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "inaccessible_cases": inaccessible_cases,
            "inaccessible_actors": inaccessible_actors,
            "inaccessible_metadata": inaccessible_metadata,
            "second_hop_cases": second_hop_cases,
            "second_hop_actors": second_hop_actors,
            "second_hop_metadata": second_hop_metadata,
            "second_hop_inaccessible_cases": second_hop_inaccessible_cases,
            "second_hop_inaccessible_actors": second_hop_inaccessible_actors,
            "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.case3.id)] = [self.entry1]
        neighbor_map[str(self.actor3.id)] = [self.entry1]
        neighbor_map[str(self.metadata1.id)] = [self.entry1]
        neighbor_map[str(self.case2.id)] = [self.entry1]
        neighbor_map[str(self.actor2.id)] = [self.entry1]

        dashboard_json = EntryDashboardSerializer(
            entities_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)

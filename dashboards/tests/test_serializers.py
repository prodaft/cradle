from unittest.mock import patch, PropertyMock

from entries.models import Entry
from entries.enums import EntryType, ArtifactSubtype
from notes.models import Note
from ..serializers import (
    NoteDashboardSerializer,
    CaseDashboardSerializer,
    ActorDashboardSerializer,
    ArtifactDashboardSerializer,
)
from .utils import DashboardsTestCase


class NoteDashboardSerializersTest(DashboardsTestCase):

    def update_notes(self):
        self.note1 = Note.objects.create(content="a" * 1000)
        self.note1.entries.add(self.case1, self.actor1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.add(self.case2, self.actor2)

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
            "entries": [
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
        actors = Entry.objects.filter(type=EntryType.ACTOR)
        cases = Entry.objects.filter(type=EntryType.CASE)
        metadata = Entry.objects.filter(type=EntryType.METADATA)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)
        inaccessible_artifacts = Entry.objects.filter(id=self.artifact1.id)
        second_hop_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        second_hop_inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)

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
                    "entries": [
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
                    "entries": [
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
            "artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Artifact1",
                    "description": "Description1",
                    "type": "artifact",
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
            "inaccessible_artifacts": [
                {
                    "id": str(self.artifact1.id),
                    "name": "Some Artifact",
                    "description": "Some Description",
                    "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
            "id": self.case1.id,
            "name": self.case1.name,
            "description": self.case1.description,
            "type": self.case1.type,
            "subtype": self.case1.subtype,
            "notes": notes,
            "actors": actors,
            "cases": cases,
            "metadata": metadata,
            "artifacts": artifacts,
            "inaccessible_cases": inaccessible_cases,
            "inaccessible_actors": inaccessible_actors,
            "inaccessible_metadata": inaccessible_metadata,
            "inaccessible_artifacts": inaccessible_artifacts,
            "second_hop_cases": second_hop_cases,
            "second_hop_actors": second_hop_actors,
            "second_hop_metadata": second_hop_metadata,
            "second_hop_inaccessible_cases": second_hop_inaccessible_cases,
            "second_hop_inaccessible_actors": second_hop_inaccessible_actors,
            "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata,
            "access": "read-write",
        }

        neighbor_map = {}

        neighbor_map[str(self.case3.id)] = [self.artifact1]
        neighbor_map[str(self.actor3.id)] = [self.artifact1]
        neighbor_map[str(self.metadata1.id)] = [self.artifact1]
        neighbor_map[str(self.case2.id)] = [self.artifact1]
        neighbor_map[str(self.actor2.id)] = [self.artifact1]

        dashboard_json = CaseDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)


class ActorDashboardSerializerTest(DashboardsTestCase):

    def setUp(self):
        super().setUp()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_actor_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entry.objects.filter(type=EntryType.ACTOR)
        cases = Entry.objects.filter(type=EntryType.CASE)
        metadata = Entry.objects.filter(type=EntryType.METADATA)
        inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        second_hop_inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)

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
                    "entries": [
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
                    "entries": [
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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

        neighbor_map[str(self.case3.id)] = [self.artifact1]
        neighbor_map[str(self.actor3.id)] = [self.artifact1]
        neighbor_map[str(self.metadata1.id)] = [self.artifact1]
        neighbor_map[str(self.case2.id)] = [self.artifact1]
        neighbor_map[str(self.actor2.id)] = [self.artifact1]

        dashboard_json = ActorDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)


class ArtifactDashboardSerializerTest(DashboardsTestCase):

    def setUp(self):
        super().setUp()

        self.artifact2 = Entry.objects.create(
            name="Artifact2",
            description="Description2",
            type=EntryType.ARTIFACT,
            subtype=ArtifactSubtype.URL,
        )
        self.note1.entries.add(self.artifact2)
        self.note2.entries.add(self.artifact2)

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_artifact_dashboard_serializer(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entry.objects.filter(type=EntryType.ACTOR)
        cases = Entry.objects.filter(type=EntryType.CASE)
        metadata = Entry.objects.filter(type=EntryType.METADATA)
        inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
        inaccessible_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_metadata = Entry.objects.filter(id=self.metadata1.id)
        second_hop_inaccessible_cases = Entry.objects.filter(id=self.case2.id)
        second_hop_inaccessible_actors = Entry.objects.filter(id=self.actor2.id)
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
                            "id": str(self.artifact1.id),
                            "name": "Artifact1",
                            "description": "Description1",
                            "type": "artifact",
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
            "subtype": self.artifact2.subtype,
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

        neighbor_map[str(self.case3.id)] = [self.artifact1]
        neighbor_map[str(self.actor3.id)] = [self.artifact1]
        neighbor_map[str(self.metadata1.id)] = [self.artifact1]
        neighbor_map[str(self.case2.id)] = [self.artifact1]
        neighbor_map[str(self.actor2.id)] = [self.artifact1]

        dashboard_json = ArtifactDashboardSerializer(
            entries_dict, context=neighbor_map
        ).data

        self.assertEqual(expected_json, dashboard_json)

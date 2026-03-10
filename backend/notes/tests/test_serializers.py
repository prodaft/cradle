from uuid import UUID

from core.exceptions import InvalidRequestException

from ..exceptions import NoteDoesNotExistException
from ..models import Note
from ..serializers import ReportQuerySerializer
from .utils import NotesTestCase


class ReportQuerySerializerTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.notes = []
        for i in range(0, 3):
            self.notes.append(Note.objects.create(content=f"{i}"))

    def test_serializer_empty_note_ids_rejected(self):
        serializer = ReportQuerySerializer(data={"note_ids": []})
        self.assertFalse(serializer.is_valid())

    def test_serializer_invalid_uuid_rejected(self):
        serializer = ReportQuerySerializer(data={"note_ids": ["heloo"]})
        self.assertFalse(serializer.is_valid())

    def test_validate_notes_not_unique(self):
        note_ids = [
            [self.notes[0].pk, self.notes[1].pk, self.notes[1].pk],
            [self.notes[2].pk, self.notes[1].pk, self.notes[2].pk],
            [self.notes[2].pk, self.notes[2].pk, self.notes[2].pk],
            [self.notes[2].pk, self.notes[2].pk, self.notes[0].pk],
        ]

        serializer = ReportQuerySerializer()
        for test_entity in note_ids:
            with self.subTest(f"{test_entity}"):
                with self.assertRaises(InvalidRequestException):
                    serializer.validate_note_ids(test_entity)

    def test_validate_notes_not_in_database(self):
        note_ids = [
            [UUID(int=0), UUID(int=1), UUID(int=2)],
            [self.notes[2].pk, UUID(int=0)],
            [self.notes[0].pk, UUID(int=0), self.notes[1].pk],
        ]
        serializer = ReportQuerySerializer()
        for test_entity in note_ids:
            with self.subTest(f"{test_entity}"):
                with self.assertRaises(NoteDoesNotExistException):
                    serializer.validate_note_ids(test_entity)

    def test_validate_notes_successful(self):
        note_ids = [
            [self.notes[2].pk, self.notes[1].pk],
            [self.notes[1].pk, self.notes[2].pk],
            [self.notes[1].pk],
            [self.notes[2].pk],
        ]

        serializer = ReportQuerySerializer()
        for test_entity in note_ids:
            with self.subTest(f"{test_entity}"):
                self.assertEqual(serializer.validate_note_ids(test_entity), test_entity)

    def test_validate_note_ids_none_raises(self):
        with self.assertRaises(InvalidRequestException):
            ReportQuerySerializer().validate({"note_ids": None})

    def test_validate_successful(self):
        data = {"note_ids": [self.notes[2].pk, self.notes[1].pk]}
        self.assertEqual(ReportQuerySerializer().validate(data), data)

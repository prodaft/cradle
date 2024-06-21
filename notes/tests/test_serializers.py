from .utils import NotesTestCase
from ..models import Note
from ..exceptions import (
    InvalidRequestException,
    NoteDoesNotExistException,
    NoteNotPublishableException,
)
from ..serializers import ReportQuerySerializer
from uuid import UUID


class ReportQuerySerializerTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.notes = []
        for i in range(0, 3):
            self.notes.append(Note.objects.create(content=f"{i}"))
        self.notes[2].publishable = True
        self.notes[2].save(update_fields=["publishable"])

    def test_serializer_empty_data(self):
        serializer = ReportQuerySerializer(data=[])
        self.assertFalse(serializer.is_valid())

    def test_serializer_non_integer_data(self):
        serializer = ReportQuerySerializer(data=["heloo"])
        self.assertFalse(serializer.is_valid())

    def test_validate_notes_not_unique(self):
        note_ids = [
            [self.notes[0].pk, self.notes[1].pk, self.notes[1].pk],
            [self.notes[2].pk, self.notes[1].pk, self.notes[2].pk],
            [self.notes[2].pk, self.notes[2].pk, self.notes[2].pk],
            [self.notes[2].pk, self.notes[2].pk, self.notes[0].pk],
        ]

        for test_case in note_ids:
            with self.subTest(f"{test_case}"):
                with self.assertRaises(InvalidRequestException):
                    ReportQuerySerializer(test_case).validate_note_ids(test_case)

    def test_validate_notes_not_in_database(self):
        note_ids = [
            [UUID(int=0), UUID(int=1), UUID(int=2)],
            [self.notes[2].pk, UUID(int=0)],
            [self.notes[0].pk, UUID(int=0), self.notes[1].pk],
        ]
        for test_case in note_ids:
            with self.subTest(f"{test_case}"):
                with self.assertRaises(NoteDoesNotExistException):
                    ReportQuerySerializer(test_case).validate_note_ids(test_case)

    def test_validate_notes_not_publishable(self):
        note_ids = [
            [self.notes[2].pk, self.notes[1].pk, self.notes[0].pk],
            [self.notes[0].pk, self.notes[1].pk],
            [self.notes[0].pk, self.notes[2].pk, self.notes[1].pk],
        ]
        for test_case in note_ids:
            with self.subTest(f"{test_case}"):
                with self.assertRaises(NoteNotPublishableException):
                    ReportQuerySerializer(test_case).validate_note_ids(test_case)

    def test_validate_notes_successful(self):
        self.notes[1].publishable = True
        self.notes[1].save(update_fields=["publishable"])
        note_ids = [
            [self.notes[2].pk, self.notes[1].pk],
            [self.notes[1].pk, self.notes[2].pk],
            [self.notes[1].pk],
            [self.notes[2].pk],
        ]

        for test_case in note_ids:
            with self.subTest(f"{test_case}"):
                self.assertEqual(
                    ReportQuerySerializer(test_case).validate_note_ids(test_case),
                    test_case,
                )

    def test_validate_none(self):
        with self.assertRaises(InvalidRequestException):
            data = {"note_ids": None}
            ReportQuerySerializer(data).validate(data)

    def test_validate_successful(self):
        data = {"note_ids": [self.notes[2].pk, self.notes[1].pk]}
        self.assertEqual(ReportQuerySerializer(data).validate(data), data)

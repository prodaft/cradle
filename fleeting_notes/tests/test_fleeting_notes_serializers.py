from datetime import datetime, timezone

from .utils import FleetingNotesTestCase
from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import (
    FleetingNoteSerializer,
    FleetingNoteTruncatedRetrieveSerializer,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class FleetingNoteSerializerTest(FleetingNotesTestCase):
    def setUp(self):
        super().setUp()
        self.fixed_time = datetime(2024, 5, 30, 12, 0, 0, tzinfo=timezone.utc)
        self.note1 = FleetingNote.objects.create(
            user=self.normal_user, content="Short note", last_edited=self.fixed_time
        )
        self.note2 = FleetingNote.objects.create(
            user=self.normal_user,
            content="he" * 150,
            last_edited=self.fixed_time,
        )

    def test_fleeting_note_retrieve_serializer(self):
        serializer = FleetingNoteSerializer(instance=self.note1)
        data = serializer.data
        self.assertEqual(data["id"], self.note1.id)
        self.assertEqual(data["content"], self.note1.content)
        self.assertEqual(
            data["last_edited"],
            self.note1.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_fleeting_note_truncated_retrieve_serializer(self):
        serializer = FleetingNoteTruncatedRetrieveSerializer(instance=self.note2)
        data = serializer.data
        self.assertEqual(data["id"], self.note2.id)
        expected_content = "he" * 100 + "..."
        self.assertEqual(data["content"], expected_content)
        self.assertEqual(
            data["last_edited"],
            self.note2.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_fleeting_note_create_serializer(self):
        data = {"content": "New note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        serializer = FleetingNoteSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertIsNotNone(note.last_edited)
        self.assertEqual(note.user, self.normal_user)

    def test_fleeting_note_create_serializer_with_id(self):
        data = {"id": 123456789, "content": "New note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        serializer = FleetingNoteSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertNotEqual(note.id, 123456789)
        self.assertIsNotNone(note.last_edited)
        self.assertEqual(note.user, self.normal_user)

    def test_fleeting_note_update_serializer(self):
        data = {"content": "Updated note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        fleeting_note = FleetingNote.objects.create(
            user=self.normal_user, content="Old note content"
        )
        serializer = FleetingNoteSerializer(fleeting_note, data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "Updated note content")
        self.assertEqual(note.user, self.normal_user)
        self.assertEqual(note.id, fleeting_note.id)

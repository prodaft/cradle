from datetime import datetime, timezone

from .utils import FleetingNotesTestCase
from notes.models import Note
from notes.serializers import (
    FleetingNoteSerializer,
    FleetingNoteRetrieveSerializer,
)
from django.contrib.auth import get_user_model

import uuid

User = get_user_model()


class FleetingNoteSerializerTest(FleetingNotesTestCase):
    def setUp(self):
        super().setUp()
        self.fixed_time = datetime(2024, 5, 30, 12, 0, 0, tzinfo=timezone.utc)
        self.note1 = Note.objects.create(
            author=self.normal_user,
            content="Short note",
            timestamp=self.fixed_time,
            fleeting=True,
        )
        self.note2 = Note.objects.create(
            author=self.normal_user,
            content="he" * 150,
            timestamp=self.fixed_time,
            fleeting=True,
        )

    def test_fleeting_note_retrieve_serializer(self):
        serializer = FleetingNoteSerializer(instance=self.note1)
        data = serializer.data
        self.assertEqual(data["id"], str(self.note1.id))
        self.assertEqual(data["content"], self.note1.content)
        self.assertEqual(
            data["timestamp"],
            self.note1.timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_fleeting_note_truncated_retrieve_serializer(self):
        serializer = FleetingNoteRetrieveSerializer(instance=self.note2, truncate=200)
        data = serializer.data
        self.assertEqual(data["id"], str(self.note2.id))
        expected_content = "he" * 100 + "..."
        self.assertEqual(data["content"], expected_content)
        self.assertEqual(
            data["timestamp"],
            self.note2.timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_fleeting_note_create_serializer(self):
        data = {"content": "New note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        serializer = FleetingNoteSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertIsNotNone(note.timestamp)
        self.assertEqual(note.author, self.normal_user)

    def test_fleeting_note_create_serializer_with_id(self):
        data = {"id": uuid.uuid4(), "content": "New note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        serializer = FleetingNoteSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertNotEqual(note.id, uuid.uuid4())
        self.assertIsNotNone(note.timestamp)
        self.assertEqual(note.author, self.normal_user)

    def test_fleeting_note_update_serializer(self):
        data = {"content": "Updated note content"}
        context = {"request": type("Request", (object,), {"user": self.normal_user})}
        fleeting_note = Note.objects.create(
            author=self.normal_user, content="Old note content", fleeting=True
        )
        serializer = FleetingNoteSerializer(fleeting_note, data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "Updated note content")
        self.assertEqual(note.author, self.normal_user)
        self.assertEqual(note.id, fleeting_note.id)

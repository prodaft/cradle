from datetime import datetime, timezone

from django.test import TestCase
from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import (
    FleetingNoteRetrieveSerializer,
    FleetingNoteTruncatedRetrieveSerializer,
    FleetingNoteCreateSerializer,
    FleetingNoteUpdateSerializer,
)
from django.contrib.auth import get_user_model

from user.models import CradleUser

User = get_user_model()


class FleetingNoteSerializerTest(TestCase):
    def setUp(self):
        self.user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.fixed_time = datetime(2024, 5, 30, 12, 0, 0, tzinfo=timezone.utc)
        self.note1 = FleetingNote.objects.create(
            user=self.user, content="Short note", last_edited=self.fixed_time
        )
        self.note2 = FleetingNote.objects.create(
            user=self.user,
            content="he" * 150,
            last_edited=self.fixed_time,
        )

    def test_fleeting_note_retrieve_serializer(self):
        serializer = FleetingNoteRetrieveSerializer(instance=self.note1)
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
        context = {"request": type("Request", (object,), {"user": self.user})}
        serializer = FleetingNoteCreateSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertIsNotNone(note.last_edited)
        self.assertEqual(note.user, self.user)

    def test_fleeting_note_create_serializer_with_id(self):
        data = {"id": 123456789, "content": "New note content"}
        context = {"request": type("Request", (object,), {"user": self.user})}
        serializer = FleetingNoteCreateSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "New note content")
        self.assertIsNotNone(note.id)
        self.assertNotEqual(note.id, 123456789)
        self.assertIsNotNone(note.last_edited)
        self.assertEqual(note.user, self.user)

    def test_fleeting_note_update_serializer(self):
        data = {"content": "Updated note content"}
        context = {"request": type("Request", (object,), {"user": self.user})}
        fleeting_note = FleetingNote.objects.create(
            user=self.user, content="Old note content"
        )
        serializer = FleetingNoteUpdateSerializer(
            fleeting_note, data=data, context=context
        )
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        self.assertEqual(note.content, "Updated note content")
        self.assertEqual(note.user, self.user)
        self.assertEqual(note.id, fleeting_note.id)

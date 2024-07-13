from .utils import FleetingNotesTestEntity
from django.urls import reverse
from entries.models import Entry
from entries.enums import EntryType
from access.models import Access
from access.enums import AccessType
from notes.models import Note
from ..models import FleetingNote

import uuid


class FleetingNotesFinalTest(FleetingNotesTestEntity):

    def setUp(self):
        super().setUp()
        self.saved_entity = Entry.objects.create(name="entity", type=EntryType.ENTITY)
        self.saved_actor = Entry.objects.create(name="actor", type=EntryType.ACTOR)

    def test_fleeting_note_final_does_not_exist(self):
        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": uuid.uuid4()}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data, "The Fleeting Note does not exist")

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_not_users_note(self):
        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_admin.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data, "The Fleeting Note does not exist")

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_not_authentication(self):
        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk})
        )

        self.assertEqual(response.status_code, 401)

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_not_enough_references(self):
        self.note_user.content = "Lorem ipsum"
        self.note_user.save()

        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 400)

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_entries_that_do_not_exist(self):
        self.note_user.content = "[[actor:actor]] [[entity:wrongentity]]"
        self.note_user.save()

        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced actors or entities do not exist."
        )

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_has_no_access_to_entities(self):
        self.note_user.content = "[[actor:actor]] [[entity:entity]]"
        self.note_user.save()

        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced actors or entities do not exist."
        )

        self.assertIsNotNone(FleetingNote.objects.get(id=self.note_user.pk))

    def test_fleeting_note_final_successfully(self):
        Access.objects.create(
            user=self.normal_user,
            entity=self.saved_entity,
            access_type=AccessType.READ_WRITE,
        )

        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk}),
            **self.headers_normal,
        )

        # Check for the correct response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["content"], self.note_user.content)
        self.assertFalse(response.json()["publishable"])

        # Check that the new Note object was saved correctly
        saved_note = Note.objects.first()
        self.assertEqual(response.json()["content"], saved_note.content)
        self.assertEqual(response.json()["publishable"], saved_note.publishable)
        self.assertIsNotNone(saved_note.timestamp)

        # Check that the fleeting note has been removed
        with self.assertRaises(FleetingNote.DoesNotExist):
            FleetingNote.objects.get(id=self.note_user.pk)

    def test_fleeting_note_final_successfully_is_publishable(self):
        Access.objects.create(
            user=self.normal_user,
            entity=self.saved_entity,
            access_type=AccessType.READ_WRITE,
        )

        response = self.client.put(
            reverse("fleeting_notes_final", kwargs={"pk": self.note_user.pk}),
            {"publishable": True},
            **self.headers_normal,
        )

        self.assertTrue(response.json()["publishable"])
        saved_note = Note.objects.first()
        self.assertTrue(saved_note.publishable)

        with self.assertRaises(FleetingNote.DoesNotExist):
            FleetingNote.objects.get(id=self.note_user.pk)

"""Hanging-artifact cleanup and entity alias relations."""

from django.contrib.contenttypes.models import ContentType

from notes.models import Note
from user.models import CradleUser

from ..enums import EntryType, RelationReason
from ..models import Entry, EntryClass, Relation
from ..tasks import delete_hanging_artifacts
from .utils import EntriesTestCase


class DeleteHangingArtifactsTest(EntriesTestCase):
    def test_keeps_artifacts_that_are_still_referenced(self):
        user = CradleUser.objects.create_user(username="u", password="p", email="u@b.c")
        in_note = Entry.objects.create(name="in-note", entry_class=self.entryclass_username)
        Note.objects.create(author=user, content="x").entries.add(in_note)
        aliased = Entry.objects.create(name="aliased", entry_class=self.entryclass_username)
        Entry.objects.create(name="c1", entry_class=self.entryclass1).aliases.add(aliased)
        note_class, _ = EntryClass.objects.get_or_create(subtype="note", defaults={"type": EntryType.ARTIFACT})
        hub = Entry.objects.create(name="hub", entry_class=note_class)
        hanging = Entry.objects.create(name="hanging", entry_class=self.entryclass_username)

        deleted = delete_hanging_artifacts()

        self.assertEqual(deleted, 1)
        self.assertFalse(Entry.objects.filter(pk=hanging.pk).exists())
        self.assertEqual(Entry.objects.filter(pk__in=[in_note.pk, aliased.pk, hub.pk]).count(), 3)


class ReconnectAliasesTest(EntriesTestCase):
    def setUp(self):
        super().setUp()
        # Create the artifact first so the entity has the higher id and ends up as e2.
        self.artifact = Entry.objects.create(name="evil.com", entry_class=self.entryclass_username)
        self.entity = Entry.objects.create(name="c1", entry_class=self.entryclass1)

    def alias_relations(self):
        return Relation.objects.filter(reason=RelationReason.ALIAS)

    def test_resaving_does_not_duplicate(self):
        self.entity.aliases.add(self.artifact)
        self.entity.reconnect_aliases()
        self.entity.reconnect_aliases()

        self.assertEqual(self.alias_relations().count(), 1)
        self.assertEqual(self.alias_relations().get().e2_id, self.entity.id)

    def test_removed_alias_is_disconnected(self):
        self.entity.aliases.add(self.artifact)
        self.entity.reconnect_aliases()
        self.entity.aliases.clear()
        self.entity.reconnect_aliases()

        self.assertFalse(self.alias_relations().exists())

    def test_note_owned_alias_relations_are_kept(self):
        user = CradleUser.objects.create_user(username="u", password="p", email="u@b.c")
        note = Note.objects.create(author=user, content="x")
        note_rel = Relation.objects.create(
            e1=self.entity,
            e2=self.artifact,
            content_type=ContentType.objects.get_for_model(Note),
            object_id=note.id,
            reason=RelationReason.ALIAS,
            access_vector=1,
        )

        self.entity.reconnect_aliases()

        self.assertTrue(Relation.objects.filter(pk=note_rel.pk).exists())

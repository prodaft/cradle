"""The entity access update task must not overwrite changes made while it runs."""

from unittest.mock import patch

from django.test import TestCase

from notes.models import Note
from user.models import CradleUser

from ..enums import EntryType
from ..models import Entry, EntryClass
from ..tasks import update_accesses


class UpdateAccessesTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c")
        entity_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.entity = Entry.objects.create(name="case1", entry_class=entity_class, is_public=True)
        note = Note.objects.create(content="note", author=user)
        note.entries.add(self.entity)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_keeps_concurrent_visibility_change(self):
        def calculate_acvec(entries):
            Entry.objects.filter(pk=self.entity.pk).update(is_public=False)
            return 1

        # The task's lock decorator closes DB connections afterwards, which would end the test transaction.
        with (
            patch("entries.tasks.calculate_acvec", side_effect=calculate_acvec),
            patch("core.decorators.close_old_connections"),
        ):
            update_accesses(self.entity.id)

        self.entity.refresh_from_db()
        self.assertFalse(self.entity.is_public)


class UpdateAccessesPropagationTest(TestCase):
    """Propagation to notes is queued, except for the admin job that waits on it."""

    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        user = CradleUser.objects.create_user(username="user", password="user", email="a@b.c")
        entity_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.entity = Entry.objects.create(name="case1", entry_class=entity_class)
        self.note = Note.objects.create(content="note", author=user, access_vector=1)
        self.note.entries.add(self.entity)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def run_task(self, **kwargs):
        # The task's lock decorator closes DB connections afterwards, which would end the test transaction.
        with (
            patch("core.decorators.close_old_connections"),
            patch("notes.tasks.propagate_acvec.run") as propagate,
            patch("celery.canvas.group.apply_async") as queue,
            self.captureOnCommitCallbacks(execute=True),
        ):
            update_accesses(self.entity.id, **kwargs)
        return propagate, queue

    def test_queues_propagation_by_default(self):
        propagate, queue = self.run_task()

        propagate.assert_not_called()
        queue.assert_called_once_with()

    def test_propagates_inline_when_asked(self):
        propagate, queue = self.run_task(propagate_inline=True)

        propagate.assert_called_once_with(self.note.id)
        queue.assert_not_called()

    def test_inline_skips_a_note_deleted_meanwhile(self):
        with (
            patch("notes.tasks.propagate_acvec.run", side_effect=Note.DoesNotExist),
            patch("core.decorators.close_old_connections"),
        ):
            update_accesses(self.entity.id, propagate_inline=True)


class EntryClassTypeChangeTest(TestCase):
    """Artifacts turned into entities start private, however they were created."""

    def test_artifacts_become_private_entities(self):
        artifact_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="actor")
        saved = Entry.objects.create(name="saved", entry_class=artifact_class)
        Entry.objects.bulk_create([Entry(name="bulk", entry_class=artifact_class)])
        self.assertTrue(saved.is_public)

        artifact_class.type = EntryType.ENTITY
        artifact_class.save()

        entries = list(Entry.objects.filter(entry_class=artifact_class))
        self.assertEqual([e.is_public for e in entries], [False, False])
        self.assertEqual(len({e.acvec_offset for e in entries}), 2)
        self.assertNotIn(0, {e.acvec_offset for e in entries})

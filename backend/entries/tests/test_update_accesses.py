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
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
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
        self.assertEqual(self.entity.status, {})

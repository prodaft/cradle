"""Management command to update all access control vectors."""

from celery import group
from django.core.management.base import BaseCommand
from django.db import transaction

from entries.enums import EntryType
from entries.models import Entry

from ...models import Note
from ...tasks import propagate_acvec
from ...utils import calculate_acvec


class Command(BaseCommand):
    help = "Update all access control vectors in the system."

    def handle(self, *args, **options):
        """Update all access control vectors in the system.

        Run: manage.py calculate_acvecs
        """
        Entry.artifacts.update(acvec_offset=0, is_public=True)

        for entry in Entry.entities.all():
            entry.save()

        notes_to_update = []
        for note in Note.objects.iterator(chunk_size=500):
            note.access_vector = calculate_acvec(note.entries.filter(entry_class__type=EntryType.ENTITY))
            notes_to_update.append(note)

        if notes_to_update:
            with transaction.atomic():
                Note.objects.bulk_update(notes_to_update, ["access_vector"])
                note_ids = [n.id for n in notes_to_update]
                transaction.on_commit(
                    lambda nids=note_ids: group(*[propagate_acvec.si(nid) for nid in nids]).apply_async()
                )

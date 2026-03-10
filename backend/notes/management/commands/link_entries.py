"""Management command to recreate all relations between entries in notes."""

from celery import chain, group
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from entries.models import Relation

from ...models import Note
from ...tasks import entry_population_task, smart_linker_task


class Command(BaseCommand):
    help = "Recreate all relations between entries in notes."

    def handle(self, *args, **options):
        """Recreates all relations between entries in notes.

        Run: manage.py link_entries
        """
        Relation.objects.filter(content_type=ContentType.objects.get_for_model(Note)).delete()

        chains = [
            chain(
                entry_population_task.si(note_id, user_id=None),
                smart_linker_task.si(note_id, user_id=None),
            )
            for note_id in Note.objects.values_list("id", flat=True)
        ]

        if chains:
            group(*chains).apply_async()

"""Management command to recreate all alias connections."""

from celery import group
from django.core.management.base import BaseCommand

from entries.constants import SUBTYPE_ALIAS
from entries.models import Entry

from ...models import Note
from ...tasks import connect_aliases


class Command(BaseCommand):
    help = "Recreate all alias connections in the system."

    def handle(self, *args, **options):
        """Recreates all alias connections in the system.

        Run: manage.py link_aliases
        """
        Entry.objects.filter(entry_class__subtype=SUBTYPE_ALIAS).delete()

        tasks = [connect_aliases.si(note_id, None) for note_id in Note.objects.values_list("id", flat=True)]

        if tasks:
            group(*tasks).apply_async()

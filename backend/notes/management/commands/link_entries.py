from celery import chain
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from notes.models import Note
from entries.models import Relation
from notes.processor.entry_population_task import EntryPopulationTask
from notes.processor.smart_linker_task import SmartLinkerTask


class Command(BaseCommand):
    def handle(self, *args, **options):
        """Recreates all of the relations between
        entries.

        To run this command use:

        ```python manage.py link_entries```

        Args:
            *args: Variable length argument list.
            **options: Arbitrary keyword arguments.
        """
        Relation.objects.filter(
            content_type=ContentType.objects.get_for_model(Note)
        ).delete()

        for i in Note.objects.all():
            creation_task, _ = EntryPopulationTask(None).run(i, [])
            linker_task, _ = SmartLinkerTask(None).run(i, [])
            chain(creation_task, linker_task).apply_async()

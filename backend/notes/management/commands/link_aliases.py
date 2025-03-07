from celery import group
from django.core.management.base import BaseCommand

from entries.models import Entry
from notes.models import Note
from notes.processor.connect_aliases_task import AliasConnectionTask


class Command(BaseCommand):
    def handle(self, *args, **options):
        """Recreates all the alias connections in the system.

        To run this command use:

        ```python manage.py link_entries```

        Args:
            *args: Variable length argument list.
            **options: Arbitrary keyword arguments.
        """
        Entry.objects.filter(entry_class__subtype="alias").delete()
        Entry.objects.filter(entry_class__subtype="alias").delete()

        tasks = []
        for i in Note.objects.all():
            task, _ = AliasConnectionTask(None).run(i, [])
            tasks.append(task)

        g = group(*tasks)
        g.apply_async()

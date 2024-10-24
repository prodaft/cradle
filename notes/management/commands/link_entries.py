from django.core.management.base import BaseCommand

from notes.models import Note, Relation
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
        Relation.objects.all().delete()

        for i in Note.objects.all():
            SmartLinkerTask().run(i)

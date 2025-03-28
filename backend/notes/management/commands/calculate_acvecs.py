from django.core.management.base import BaseCommand
from django_lifecycle.mixins import transaction

from entries.enums import EntryType
from entries.models import Entry
from notes.models import Note
from notes.utils import calculate_acvec
from notes.tasks import propagate_acvec


class Command(BaseCommand):
    def handle(self, *args, **options):
        """Update all access control vectors in the system.

        To run this command use:

        ```python manage.py calculate_acvec```

        Args:
            *args: Variable length argument list.
            **options: Arbitrary keyword arguments.
        """
        Entry.artifacts.update(acvec_offset=0, is_public=True)

        for entry in Entry.entities.all():
            entry.setup_access()
            entry.save()

        notes = Note.objects.all()

        for note in notes:
            note.access_vector = calculate_acvec(
                note.entries.filter(entry_class__type=EntryType.ENTITY)
            )
            note.save()
            transaction.on_commit(lambda: propagate_acvec.apply_async((note.id,)))

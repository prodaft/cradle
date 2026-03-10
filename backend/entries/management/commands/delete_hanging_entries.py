"""Management command to delete unreferenced artifacts."""

from django.core.management.base import BaseCommand

from ...models import Entry


class Command(BaseCommand):
    help = "Delete artifacts that are not referenced by any relation."

    def handle(self, *args, **options):
        """Delete all hanging (unreferenced) artifacts."""
        hanging = Entry.objects.is_artifact().unreferenced()
        count = hanging.count()

        if count == 0:
            self.stdout.write("No hanging artifacts found.")
        else:
            self.stdout.write(f"Deleting {count} hanging artifact(s)...")
            hanging.delete()

"""Management command to delete unreferenced artifacts."""

from django.core.management.base import BaseCommand

from ...tasks import delete_hanging_artifacts


class Command(BaseCommand):
    help = "Delete artifacts that are not referenced by any relation, note or entity."

    def handle(self, *args, **options):
        """Delete all hanging (unreferenced) artifacts."""
        count = delete_hanging_artifacts()

        if count == 0:
            self.stdout.write("No hanging artifacts found.")
        else:
            self.stdout.write(f"Deleted {count} hanging artifact(s).")

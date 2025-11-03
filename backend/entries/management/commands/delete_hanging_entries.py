from django.core.management.base import BaseCommand

from entries.models import Entry


class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        Deletes the artifacts that are not referenced by any note
        """
        hanging = Entry.objects.is_artifact().unreferenced()

        print(f"Found {hanging.count()} hanging artifacts. ", end="")
        if hanging.count() == 0:
            print("Moving on...")
        else:
            print("Deleting...")

        hanging.delete()

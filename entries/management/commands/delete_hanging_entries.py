import random
import string

from django.core.management.base import BaseCommand
from entries.models import Entry
from user.models import CradleUser


class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        Deletes the artifacts that are not referenced by any note
        """
        hanging = Entry.objects.is_artifact().unreferenced()

        print(f"Found {hanging.count()} hanging artifacts. Deleting.")

        hanging.delete()

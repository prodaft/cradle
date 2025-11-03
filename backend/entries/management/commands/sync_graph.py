from django.core.management.base import BaseCommand

from entries.tasks import refresh_edges_materialized_view


class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        Recreates the materialized view and refreshes the edge positions
        """
        refresh_edges_materialized_view.apply_async()

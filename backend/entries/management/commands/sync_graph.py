"""Management command to refresh the edges materialized view."""

from django.core.management.base import BaseCommand

from ...tasks import refresh_edges_materialized_view


class Command(BaseCommand):
    help = "Refreshes the edges materialized view and updates entry degrees."

    def handle(self, *args, **options):
        """Trigger async refresh of edges materialized view."""
        refresh_edges_materialized_view.apply_async()

from django.core.management.base import BaseCommand
from entries.tasks import refresh_edges_materialized_view
from entries.tasks import simulate_graph


class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        Recreates the materialized view and refreshes the edge positions
        """
        refresh = refresh_edges_materialized_view.si()
        simulate = simulate_graph.si()

        group = refresh | simulate
        group.apply_async()

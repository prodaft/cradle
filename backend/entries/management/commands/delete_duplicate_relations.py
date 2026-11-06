"""Management command to delete relations that exactly repeat another one."""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from ...tasks import refresh_edges_materialized_view

# Every column that gives a relation meaning: rows equal on all of them say the same thing twice. Relations with
# attachments are never deleted, and are kept in preference to their copies.
DUPLICATES_SQL = """
    SELECT id, reason FROM (
        SELECT id, reason, has_attachments,
               row_number() OVER (
                   PARTITION BY e1_id, e2_id, reason, reason_context, content_type_id, object_id,
                                access_vector, virtual, created_at, details
                   ORDER BY has_attachments DESC, id
               ) AS position
        FROM (
            SELECT r.*, EXISTS (SELECT 1 FROM entries_attachment a WHERE a.relation_id = r.id) AS has_attachments
            FROM entries_relation r
        ) relations
    ) ranked
    WHERE position > 1 AND NOT has_attachments
"""


class Command(BaseCommand):
    help = "Delete relations that exactly repeat another one (keeping one of each), then refresh the graph."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Only report how many would be deleted.")
        parser.add_argument("--batch-size", type=int, default=10000, help="Relations deleted per transaction.")

    def handle(self, *args, dry_run=False, batch_size=10000, **options):
        """Find the duplicates, report them by reason, and delete them in batches unless ``dry_run``."""
        if batch_size < 1:
            raise CommandError("--batch-size must be at least 1.")
        with connection.cursor() as cursor:
            cursor.execute(DUPLICATES_SQL)
            duplicates = cursor.fetchall()

        by_reason: dict[str, int] = {}
        for _, reason in duplicates:
            by_reason[reason] = by_reason.get(reason, 0) + 1
        for reason, count in sorted(by_reason.items(), key=lambda item: -item[1]):
            self.stdout.write(f"  {reason}: {count}")
        self.stdout.write(f"{len(duplicates)} duplicate relation(s) found.")

        if dry_run or not duplicates:
            return

        ids = [relation_id for relation_id, _ in duplicates]
        for start in range(0, len(ids), batch_size):
            with transaction.atomic(), connection.cursor() as cursor:
                cursor.execute("DELETE FROM entries_relation WHERE id = ANY(%s)", [ids[start : start + batch_size]])
            self.stdout.write(f"Deleted {min(start + batch_size, len(ids))}/{len(ids)}")

        self.stdout.write("Refreshing the graph...")
        refresh_edges_materialized_view()
        self.stdout.write(f"Deleted {len(ids)} duplicate relation(s).")

from typing import List
import uuid
from django.db import connection
from django.db.models import F, ExpressionWrapper, Value

from core.fields import BitStringField
from entries.models import Edge, Entry, Relation


fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


def get_neighbors(sourceset, depth, user=None):
    """
    Returns a QuerySet of Entry objects that are exactly `depth` hops away from source_entry.
    Only follows relations where accessible=True, and ensures nodes visited at earlier
    depths are not revisited.
    """
    current_level = sourceset
    visited = [current_level]

    for _ in range(depth):
        edges = Edge.objects.filter(src__in=current_level)
        if user:
            edges = edges.accessible(user=user)

        dst_ids = edges.values_list("dst", flat=True).distinct()

        qs = Entry.objects.filter(
            id__in=dst_ids,
        )

        for v in visited:
            qs = qs.exclude(pk__in=v)

        qs = qs.distinct()

        # Update the sets
        current_level = qs
        visited.append(current_level)

    # Return a queryset for the final level
    return current_level


def get_edges_for_paths(
    start_uuid: uuid.UUID, end_uuids: List[uuid.UUID]
) -> List[Edge]:
    """
    Returns a de-duplicated list of Edge objects used in shortest paths
    from a single start UUID to multiple end UUIDs.
    """
    if not end_uuids:
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH
            start_node AS (
                SELECT id FROM node_map WHERE uuid = %s
            ),
            end_nodes AS (
                SELECT id FROM node_map WHERE uuid = ANY(%s)
            ),
            route AS (
                SELECT * FROM pgr_dijkstra(
                    'SELECT edge_id AS id, src_id AS source, dst_id AS target, age AS cost FROM edges_with_ids',
                    (SELECT id FROM start_node),
                    ARRAY(SELECT id FROM end_nodes),
                    directed := true
                )
            )
            SELECT DISTINCT e.id
            FROM route r
            JOIN edges_with_ids e ON r.edge = e.edge_id
            WHERE r.edge != -1;
        """,
            [str(start_uuid), [str(u) for u in end_uuids]],
        )

        edge_uuids = [row[0] for row in cursor.fetchall()]

    return list(Edge.objects.filter(id__in=edge_uuids))

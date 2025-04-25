from typing import List
from django.db import connection
from django.db.models import Q

from core.fields import BitStringField
from entries.models import Edge, Entry


fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


def get_neighbors(sourceset, depth, user=None, skip_virtual=False):
    """
    Returns a QuerySet of Entry objects that are exactly `depth` hops away from source_entry.
    Only follows relations where accessible=True, and ensures nodes visited at earlier
    depths are not revisited.
    """
    if depth == 0:
        return sourceset

    current_level = sourceset
    visited = [current_level]

    for _ in range(depth):
        if skip_virtual:
            virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
            virt_ids = virt_edges.values_list("dst", flat=True).distinct()

            edges = Edge.objects.filter(
                Q(src__in=current_level, virtual=False)
                | Q(src__in=virt_ids, virtual=True)
            )
        else:
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
        current_level = qs

        visited.append(current_level)

        if skip_virtual:
            visited.append(virt_ids)

    # Return a queryset for the final level
    return current_level


def get_edges_for_paths(start_id, targets, user, start_time, end_time) -> List[Edge]:
    """
    Compute Dijkstra shortest paths from a single source to multiple targets with time and access vector filtering.
    """
    # Safely format the target array as SQL literal
    target_array = "ARRAY[%s]" % ",".join(str(int(t)) for t in targets)

    # The dynamic SQL for the filtered edge set
    inner_sql = f"""
        SELECT id, src AS source, dst AS target, age AS cost
        FROM edges
        WHERE created_at <= %s
          AND last_seen >= %s
          AND (%s & access_vector) = '{fieldtype.get_prep_value(0)}'
    """

    # The full pgr_dijkstra SQL
    full_sql = f"""
        SELECT seq, path_seq, node, edge, cost, agg_cost
        FROM pgr_dijkstra(
            $$ {inner_sql} $$,
            %s,
            {target_array},
            directed := true
        );
    """

    params = [
        end_time,
        start_time,
        user.access_vector_inv,
        start_id,
    ]

    with connection.cursor() as cursor:
        cursor.execute(full_sql, params)
        edge_ids = [row[3] for row in cursor.fetchall()]

    if not edge_ids:
        return []

    edges = list(Edge.objects.filter(id__in=edge_ids))
    return edges


def filter_valid_edges(edges: List[Edge]) -> List[Edge]:
    srcids = {edge.src for edge in edges}
    dstids = {edge.dst for edge in edges}

    ids = srcids | dstids

    entries = set(Entry.objects.filter(id__in=ids).values_list("id", flat=True))

    edges = [edge for edge in edges if edge.src in entries and edge.dst in entries]
    return edges

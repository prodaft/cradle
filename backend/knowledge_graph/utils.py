"""Graph traversal utilities: neighbor discovery, path finding, and edge filtering."""

from datetime import datetime
from typing import Callable, List, Optional

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import IntegerField, Q, QuerySet, Value

from entries.managers import fieldtype
from entries.models import Edge, Entry

User = get_user_model()


def _get_next_level(
    current_level: QuerySet,
    visited: list,
    user: Optional[User],
    skip_virtual: bool,
) -> QuerySet:
    """Compute raw next level of neighbors from current_level, excluding visited nodes."""
    if skip_virtual:
        virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
        virt_ids = virt_edges.values_list("dst", flat=True).distinct()
        edges = Edge.objects.filter(Q(src__in=current_level, virtual=False) | Q(src__in=virt_ids, virtual=True))
    else:
        edges = Edge.objects.filter(src__in=current_level)

    if user:
        edges = edges.accessible(user=user)

    dst_ids = edges.values_list("dst", flat=True).distinct()
    qs = Entry.objects.filter(id__in=dst_ids)
    for v in visited:
        qs = qs.exclude(pk__in=v)
    return qs.distinct()


def get_neighbors(
    sourceset: QuerySet,
    depth: int,
    user: Optional[User] = None,
    skip_virtual: bool = False,
    cumulative: bool = False,
    filter: Optional[Callable[[QuerySet], QuerySet]] = None,
) -> QuerySet:
    """Return entries exactly `depth` hops away from the source set.

    Follows only accessible relations; avoids revisiting nodes from earlier depths.
    """
    current_level = sourceset
    result = filter(current_level) if filter else current_level
    visited = [current_level]
    if skip_virtual:
        virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
        visited.append(virt_edges.values_list("dst", flat=True).distinct())

    for _ in range(depth):
        current_level = _get_next_level(current_level, visited, user, skip_virtual)
        lvl = filter(current_level) if filter else current_level
        if cumulative:
            result = result | lvl
        else:
            result = lvl

        visited.append(current_level)
        if skip_virtual:
            virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
            visited.append(virt_edges.values_list("dst", flat=True).distinct())

    return result


def get_neighbors_paginated(
    sourceset: QuerySet,
    depth: int,
    user: Optional[User] = None,
    skip_virtual: bool = False,
    cumulative: bool = False,
    filter: Optional[Callable[[QuerySet], QuerySet]] = None,
    page_size: int = 1000,
    page_number: int = 1,
    order_by: str = "-last_seen",
) -> QuerySet:
    """Return paginated neighbors at `depth` hops from the source set.

    Same traversal logic as get_neighbors but with pagination and ordering.
    """
    current_level = sourceset

    offset = (page_number - 1) * page_size
    count = 0
    results = {}
    visited = [current_level]
    if skip_virtual:
        virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
        visited.append(virt_edges.values_list("dst", flat=True).distinct())

    if offset == 0:
        lvl = (filter(current_level) if filter else current_level).order_by(order_by)
        results[0] = lvl
        count += lvl.count()

    for current_depth in range(depth):
        if count >= page_size:
            break

        current_level = _get_next_level(current_level, visited, user, skip_virtual)
        lvl = (filter(current_level) if filter else current_level).order_by(order_by)

        visited.append(current_level)
        if skip_virtual:
            virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
            visited.append(virt_edges.values_list("dst", flat=True).distinct())

        if cumulative:
            if offset > 0:
                lvl_count = lvl[:offset].count()
                if lvl_count == offset:
                    lvl = lvl[offset:]
                offset -= lvl_count

            if offset == 0:
                results[current_depth + 1] = lvl[: (page_size - count)]
                count += lvl.count()

        else:
            results = {current_depth + 1: lvl[offset : offset + page_size]}

    final_result = None
    for k, v in results.items():
        v = v.annotate(depth=Value(k, output_field=IntegerField()))
        if final_result is None:
            final_result = v
        else:
            final_result = final_result.union(v)

    if final_result is None:
        return Entry.objects.none()
    return final_result.order_by("depth")


def get_edges_for_paths(
    start_id: int,
    targets: List[int],
    user: User,
    start_time: datetime,
    end_time: datetime,
) -> List[Edge]:
    """Compute Dijkstra shortest paths from one source to multiple targets.

    Filters edges by time range and user access vector.
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
            %s::BIGINT,
            {target_array}::BIGINT[],
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
    """Drop edges whose src or dst entry no longer exists."""
    ids = {e.src for e in edges} | {e.dst for e in edges}
    valid_ids = set(Entry.objects.filter(id__in=ids).values_list("id", flat=True))

    return [e for e in edges if e.src in valid_ids and e.dst in valid_ids]

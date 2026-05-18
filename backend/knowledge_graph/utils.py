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

    When ``cumulative`` is True, depth levels are concatenated in order (depth 0,
    then 1, ...) with ``order_by`` applied within each level. The global offset
    ``(page_number - 1) * page_size`` skips entries across that combined sequence,
    then at most ``page_size`` rows are returned (callers often pass
    ``page_size + 1`` so the API can report ``has_next`` without loading an
    unbounded queryset). Skipping within a level still uses ``COUNT`` once for
    that level; taking from the start of a level uses a bounded ``LIMIT`` on ids
    instead of counting the whole level.

    When ``cumulative`` is False, only the deepest hop is paginated (``offset``
    and ``page_size`` apply to that level only).
    """
    offset = (page_number - 1) * page_size
    visited: list = [sourceset]
    if skip_virtual:
        virt_edges = Edge.objects.filter(src__in=sourceset, virtual=True)
        visited.append(virt_edges.values_list("dst", flat=True).distinct())

    if cumulative:
        skip_remaining = offset
        rows_left = page_size
        results: dict[int, QuerySet] = {}

        def ordered_qs(level_qs: QuerySet) -> QuerySet:
            return (filter(level_qs) if filter else level_qs).order_by(order_by)

        def take_from_level(level_qs: QuerySet, depth_key: int) -> None:
            nonlocal skip_remaining, rows_left
            if rows_left <= 0:
                return
            qs = ordered_qs(level_qs)
            if not qs.exists():
                return
            if skip_remaining:
                total = qs.count()
                if skip_remaining >= total:
                    skip_remaining -= total
                    return
                start = skip_remaining
                skip_remaining = 0
            else:
                start = 0
            # Avoid a full-table count when taking from the head of a level: fetch at most
            # ``rows_left`` primary keys, then re-filter to preserve ``order_by``.
            end = start + rows_left
            ids = list(qs.values_list("id", flat=True)[start:end])
            if not ids:
                return
            chunk = len(ids)
            results[depth_key] = qs.filter(id__in=ids).order_by(order_by)
            rows_left -= chunk

        take_from_level(sourceset, 0)

        current_level = sourceset
        for hop in range(depth):
            if rows_left <= 0:
                break
            current_level = _get_next_level(current_level, visited, user, skip_virtual)
            visited.append(current_level)
            if skip_virtual:
                virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
                visited.append(virt_edges.values_list("dst", flat=True).distinct())
            take_from_level(current_level, hop + 1)

        if not results:
            return Entry.objects.none()
        final_result = None
        for k in sorted(results):
            v = results[k].annotate(depth=Value(k, output_field=IntegerField()))
            final_result = v if final_result is None else final_result.union(v)
        return final_result.order_by("depth")

    current_level = sourceset
    for _ in range(depth):
        current_level = _get_next_level(current_level, visited, user, skip_virtual)
        visited.append(current_level)
        if skip_virtual:
            virt_edges = Edge.objects.filter(src__in=current_level, virtual=True)
            visited.append(virt_edges.values_list("dst", flat=True).distinct())

    lvl = (filter(current_level) if filter else current_level).order_by(order_by)
    return lvl[offset : offset + page_size].annotate(depth=Value(depth, output_field=IntegerField()))


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

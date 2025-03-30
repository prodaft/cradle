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

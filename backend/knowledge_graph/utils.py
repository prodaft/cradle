from django.db.models import F, ExpressionWrapper, Value

from core.fields import BitStringField
from entries.models import Entry, Relation


fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


def get_neighbors(source_entry, depth, user=None):
    """
    Returns a QuerySet of Entry objects that are exactly `depth` hops away from source_entry.
    Only follows relations where accessible=True, and ensures nodes visited at earlier
    depths are not revisited.
    """
    visited = []
    current_level = {source_entry.pk}

    for _ in range(depth):
        rels = Relation.objects.filter(src_entry__in=current_level)
        if user:
            rels = rels.annotate(
                combined_access=ExpressionWrapper(
                    F("access_vector").bitor(Value(user.access_vector)),
                    output_field=fieldtype,
                )
            ).filter(
                combined_access=Value(user.access_vector)
            )  # All relations accessible from the current level

        qs = Entry.objects.filter(
            dst_relations__in=rels,
        ).exclude(pk=source_entry.pk)  # Get all endpoints of those relations

        for v in visited:
            qs = qs.exclude(pk__in=v)  # Exclude all previously visited nodes

        qs = qs.distinct()

        # Update the sets
        current_level = qs
        visited.append(current_level)

    # Return a queryset for the final level
    return current_level

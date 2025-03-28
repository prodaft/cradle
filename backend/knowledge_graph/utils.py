from django.db.models import F, ExpressionWrapper, Value

from core.fields import BitStringField
from entries.models import Entry, Relation


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
        rels = Relation.objects.filter(src_entry__in=current_level)
        if user:
            rels = rels.extra(
                where=["(access_vector & %s) = %s"],
                params=[user.access_vector_inv, fieldtype.get_prep_value(0)],
            )

        qs = Entry.objects.filter(
            dst_relations__in=rels,
        )

        for v in visited:
            qs = qs.exclude(pk__in=v)  # Exclude all previously visited nodes

        qs = qs.distinct()

        # Update the sets
        current_level = qs
        visited.append(current_level)

    # Return a queryset for the final level
    return current_level

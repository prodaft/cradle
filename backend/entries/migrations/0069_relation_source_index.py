"""Index relations by their source (the note, digest or enrichment that created them).

Built concurrently so a large table keeps accepting writes while it is created.
"""

from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("entries", "0068_edges_per_access_vector"),
    ]

    operations = [
        AddIndexConcurrently(
            model_name="relation",
            index=models.Index(fields=["content_type", "object_id"], name="entries_relation_source_idx"),
        ),
    ]

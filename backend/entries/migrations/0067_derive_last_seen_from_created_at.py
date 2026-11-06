"""Drop Entry.last_seen and Relation.last_seen, which always equalled created_at.

An edge's last_seen_at is now derived in the ``edges`` view as the newest relation's created_at.
"""

from django.db import migrations, models

EDGE_SELECT = """
    SELECT
        (({a}::bigint << 32) | {b}::bigint) AS id,
        {a} AS src,
        {b} AS dst,
        BIT_AND(access_vector) AS access_vector,
        BOOL_OR(virtual) AS virtual,
        MIN(created_at) AS created_at,
        MAX({seen}) AS {seen_as},
        EXTRACT(EPOCH FROM (now() - MAX({seen}))) AS age
    FROM entries_relation
    GROUP BY e1_id, e2_id
"""


def edges_view(seen: str, seen_as: str) -> str:
    forward = EDGE_SELECT.format(a="e1_id", b="e2_id", seen=seen, seen_as=seen_as)
    backward = EDGE_SELECT.format(a="e2_id", b="e1_id", seen=seen, seen_as=seen_as)
    return f"""
        CREATE MATERIALIZED VIEW edges AS ({forward}) UNION ALL ({backward});
        CREATE UNIQUE INDEX idx_edges_id ON edges(id);
        CREATE INDEX idx_edges_src ON edges(src);
        CREATE INDEX idx_edges_dst ON edges(dst);
        CREATE INDEX idx_edges_created_at ON edges(created_at);
        CREATE INDEX idx_edges_{seen_as} ON edges({seen_as});
        CREATE INDEX idx_edges_src_lt_dst ON edges(src, dst, created_at, {seen_as}) WHERE src < dst;
    """


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0066_rename_entryclass_timestamp"),
    ]

    operations = [
        # Rolling back restores the old columns from created_at before recreating the old view.
        migrations.RunSQL(
            sql="DROP MATERIALIZED VIEW IF EXISTS edges;",
            reverse_sql="UPDATE entries_relation SET last_seen = created_at;"
            "UPDATE entries_entry SET last_seen = created_at;" + edges_view("last_seen", "last_seen"),
        ),
        migrations.AlterModelOptions(name="entry", options={"ordering": ["-created_at"]}),
        migrations.AlterModelOptions(name="relation", options={"ordering": ["-created_at"]}),
        migrations.RemoveField(model_name="entry", name="last_seen"),
        migrations.RemoveField(model_name="relation", name="last_seen"),
        migrations.RenameField(model_name="edge", old_name="last_seen", new_name="last_seen_at"),
        migrations.AlterField(
            model_name="edge",
            name="last_seen_at",
            field=models.DateTimeField(help_text="When the newest relation between the two entries was created"),
        ),
        migrations.RunSQL(
            sql=edges_view("created_at", "last_seen_at"),
            reverse_sql="DROP MATERIALIZED VIEW IF EXISTS edges;",
        ),
    ]

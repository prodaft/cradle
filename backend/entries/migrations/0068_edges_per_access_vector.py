"""Split ``edges`` rows by access vector and repair relations written with the wrong shape.

``edges`` used to merge a pair's relations with ``BIT_AND(access_vector)``, which lowers the access a pair
requires below that of every relation it came from. It now keeps one row per (pair, access vector).

Data repairs:

- Entity alias relations carried the alias artifact's vector (bit 0 only), so anyone could see them. They now
  carry the vector of their entity endpoints.
- File relations were virtual, so traversal treated files as aliases of every entity in the note. They are now
  ordinary relations, marked with ``reason_context="file"`` so link_files_task can replace them; duplicates it
  appended on every upload are removed.
"""

from importlib import import_module

from django.db import migrations

old_edges_view = import_module("entries.migrations.0067_derive_last_seen_from_created_at").edges_view

EDGE_SELECT = """
    SELECT
        (({a}::bigint << 32) | {b}::bigint) AS id,
        {a} AS src,
        {b} AS dst,
        access_vector,
        BOOL_OR(virtual) AS virtual,
        MIN(created_at) AS created_at,
        MAX(created_at) AS last_seen_at,
        EXTRACT(EPOCH FROM (now() - MAX(created_at))) AS age
    FROM entries_relation
    GROUP BY e1_id, e2_id, access_vector
"""

FORWARD = EDGE_SELECT.format(a="e1_id", b="e2_id")
BACKWARD = EDGE_SELECT.format(a="e2_id", b="e1_id")

EDGES_VIEW = f"""
    CREATE MATERIALIZED VIEW edges AS ({FORWARD}) UNION ALL ({BACKWARD});
    CREATE UNIQUE INDEX idx_edges_id_access_vector ON edges(id, access_vector);
    CREATE INDEX idx_edges_src ON edges(src);
    CREATE INDEX idx_edges_dst ON edges(dst);
    CREATE INDEX idx_edges_created_at ON edges(created_at);
    CREATE INDEX idx_edges_last_seen_at ON edges(last_seen_at);
    CREATE INDEX idx_edges_src_lt_dst ON edges(src, dst, created_at, last_seen_at) WHERE src < dst;
"""

DEDUPE_FILE_RELATIONS = """
    UPDATE entries_relation r SET virtual = false, reason_context = 'file'
    FROM entries_entry e
    WHERE r.reason = 'note' AND r.virtual AND e.entry_class_id = 'file' AND e.id IN (r.e1_id, r.e2_id);

    DELETE FROM entries_relation a USING entries_relation b
    WHERE a.reason_context = 'file' AND b.reason_context = 'file'
      AND a.e1_id = b.e1_id AND a.e2_id = b.e2_id
      AND a.content_type_id = b.content_type_id AND a.object_id = b.object_id
      AND a.id > b.id;
"""


def fix_alias_vectors(apps, schema_editor):
    """Give entity alias relations the access vector of their entity endpoints."""
    ContentType = apps.get_model("contenttypes", "ContentType")
    Relation = apps.get_model("entries", "Relation")

    entry_ct = ContentType.objects.filter(app_label="entries", model="entry").first()
    if entry_ct is None:
        return
    relations = list(
        Relation.objects.filter(reason="alias", content_type=entry_ct).select_related(
            "e1__entry_class", "e2__entry_class"
        )
    )
    for relation in relations:
        acvec = 1
        for entry in (relation.e1, relation.e2):
            if entry.entry_class.type == "entity":
                acvec |= 1 << entry.acvec_offset
        relation.access_vector = acvec
    Relation.objects.bulk_update(relations, ["access_vector"], batch_size=1000)


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0067_derive_last_seen_from_created_at"),
    ]

    operations = [
        migrations.RunPython(fix_alias_vectors, migrations.RunPython.noop),
        migrations.RunSQL(DEDUPE_FILE_RELATIONS, migrations.RunSQL.noop),
        migrations.RunSQL(
            sql="DROP MATERIALIZED VIEW IF EXISTS edges;" + EDGES_VIEW,
            reverse_sql="DROP MATERIALIZED VIEW IF EXISTS edges;" + old_edges_view("created_at", "last_seen_at"),
        ),
    ]

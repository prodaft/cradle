# Generated by Django 5.0.4 on 2024-10-23 21:17

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0013_alter_entryclass_catalyst_type"),
        ("notes", "0004_graph_traversal_functions"),
    ]

    operations = [
        migrations.CreateModel(
            name="Relation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "dst_entry",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dst_relations",
                        to="entries.entry",
                    ),
                ),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="relations",
                        to="notes.note",
                    ),
                ),
                (
                    "src_entry",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="src_relations",
                        to="entries.entry",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="relation",
            constraint=models.UniqueConstraint(
                fields=("src_entry", "dst_entry", "note"), name="unique_src_dst_note"
            ),
        ),
    ]

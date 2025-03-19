# Generated by Django 5.0.4 on 2025-03-19 10:15

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("entries", "0023_remove_entryclass_catalyst_type"),
        ("intelio", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CatalystMapping",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("level", models.CharField(max_length=255)),
                ("name", models.CharField(max_length=255)),
                (
                    "internal_class",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(class)ss",
                        to="entries.entryclass",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
    ]

# Generated by Django 5.0.4 on 2024-07-03 15:26

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("entries", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Access",
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
                    "access_type",
                    models.CharField(
                        choices=[
                            ("none", "No access"),
                            ("read", "Read access"),
                            ("read-write", "Read-write access"),
                        ],
                        default="none",
                        max_length=20,
                    ),
                ),
                (
                    "entity",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="entries.entry",
                    ),
                ),
            ],
        ),
    ]

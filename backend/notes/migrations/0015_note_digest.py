# Generated by Django 5.0.4 on 2025-03-24 22:10

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("intelio", "0001_initial"),
        ("notes", "0014_auto_20250324_2204"),
    ]

    operations = [
        migrations.AddField(
            model_name="note",
            name="digest",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="notes",
                to="intelio.basedigest",
            ),
        ),
    ]

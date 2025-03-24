# Generated by Django 5.0.4 on 2025-03-24 14:38

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("file_transfer", "0004_alter_filereference_report"),
        ("intelio", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="filereference",
            name="digest",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="files",
                to="intelio.basedigest",
            ),
        ),
    ]

# Generated by Django 5.0.4 on 2024-07-12 19:55

import django.db.models.deletion
import entries.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("entries", "0006_entryclass_options_entryclass_regex"),
    ]

    operations = [
        migrations.AlterField(
            model_name="entry",
            name="entry_class",
            field=models.ForeignKey(
                default=entries.models.EntryClass.get_default_pk,
                editable=False,
                on_delete=django.db.models.deletion.PROTECT,
                to="entries.entryclass",
            ),
        ),
        migrations.AlterField(
            model_name="entry",
            name="name",
            field=models.CharField(editable=False),
        ),
        migrations.AlterField(
            model_name="entryclass",
            name="subtype",
            field=models.CharField(
                editable=False, max_length=20, primary_key=True, serialize=False
            ),
        ),
        migrations.AlterField(
            model_name="entryclass",
            name="type",
            field=models.CharField(
                choices=[("entity", "Entity"), ("artifact", "Artifact")],
                editable=False,
                max_length=20,
            ),
        ),
    ]

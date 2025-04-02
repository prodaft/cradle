# Generated by Django 5.0.4 on 2025-04-01 22:31

from django.db import migrations, models


def copy_field_data(apps, schema_editor):
    Entry = apps.get_model("entries", "Entry")
    for obj in Entry.objects.entities():
        obj.id_copy = obj.id
        obj.save(update_fields=["id_copy"])


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0035_entry_new_id"),
        ("access", "0004_access_entity_id_back"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="entry",
            name="new_id",
        ),
        migrations.AddField(
            model_name="entry",
            name="id_copy",
            field=models.UUIDField(null=True),
        ),
        migrations.RunPython(copy_field_data),
        migrations.RemoveField(
            model_name="entry",
            name="id",
        ),
        migrations.AddField(
            model_name="entry",
            name="id",
            field=models.BigAutoField(primary_key=True, serialize=False),
        ),
    ]

# Generated by Django 5.0.4 on 2024-07-22 13:19

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0008_alter_entry_entry_class_alter_entry_id_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="entryclass",
            name="regex",
            field=models.CharField(blank=True, default="", max_length=65536),
        ),
    ]

# Generated by Django 5.0.4 on 2025-03-02 20:31

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0018_alter_entry_entry_class"),
    ]

    operations = [
        migrations.AddField(
            model_name="entryclass",
            name="description",
            field=models.TextField(blank=True, null=True),
        ),
    ]

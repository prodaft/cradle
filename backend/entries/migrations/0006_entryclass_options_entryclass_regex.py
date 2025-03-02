# Generated by Django 5.0.4 on 2024-07-12 14:07

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0005_entry_is_public"),
    ]

    operations = [
        migrations.AddField(
            model_name="entryclass",
            name="options",
            field=models.CharField(blank=True, max_length=1024),
        ),
        migrations.AddField(
            model_name="entryclass",
            name="regex",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]

# Generated by Django 5.0.4 on 2024-10-15 18:06

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0011_alter_entry_entry_class"),
    ]

    operations = [
        migrations.AddField(
            model_name="entryclass",
            name="catalyst_type",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
    ]

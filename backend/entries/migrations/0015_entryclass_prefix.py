# Generated by Django 5.0.4 on 2024-11-25 13:11

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0014_entryclass_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="entryclass",
            name="prefix",
            field=models.CharField(default="", max_length=64),
        ),
    ]

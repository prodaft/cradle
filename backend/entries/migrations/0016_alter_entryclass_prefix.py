# Generated by Django 5.0.4 on 2024-11-29 18:03

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0015_entryclass_prefix"),
    ]

    operations = [
        migrations.AlterField(
            model_name="entryclass",
            name="prefix",
            field=models.CharField(blank=True, max_length=64),
        ),
    ]

# Generated by Django 5.0.4 on 2025-03-28 23:55

from django.db import migrations
from django.contrib.postgres.operations import CreateExtension


class Migration(migrations.Migration):
    dependencies = [
        ("entries", "0027_auto_20250326_1450"),
    ]

    operations = [
        CreateExtension("postgis"),
    ]

# Generated by Django 5.0.4 on 2025-04-02 12:48

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge_graph", "0001_graph_functions"),
    ]

    operations = [
        migrations.RunSQL("CREATE EXTENSION IF NOT EXISTS pgrouting;"),
    ]

# Generated by Django 5.0.4 on 2025-02-26 18:35

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("publish", "0003_remove_publishedreport_completed_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="publishedreport",
            name="title",
            field=models.CharField(default="Title", max_length=512),
        ),
    ]

# Generated by Django 5.0.4 on 2025-02-26 18:21

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("publish", "0002_publishedreport_title"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="publishedreport",
            name="completed",
        ),
        migrations.AddField(
            model_name="publishedreport",
            name="error_message",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="publishedreport",
            name="status",
            field=models.CharField(
                choices=[("working", "Working"), ("done", "Done"), ("error", "Error")],
                default="working",
                max_length=10,
            ),
        ),
    ]

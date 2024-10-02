# Generated by Django 5.0.4 on 2024-07-03 15:26

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MessageNotification",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("message", models.CharField()),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("is_unread", models.BooleanField(default=True)),
                ("is_marked_unread", models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name="AccessRequestNotification",
            fields=[
                (
                    "messagenotification_ptr",
                    models.OneToOneField(
                        auto_created=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        parent_link=True,
                        primary_key=True,
                        serialize=False,
                        to="notifications.messagenotification",
                    ),
                ),
            ],
            bases=("notifications.messagenotification",),
        ),
    ]

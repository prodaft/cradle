# Generated by Django 5.0.4 on 2024-10-02 13:05

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0002_cradleuser_timestamp"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="cradleuser",
            name="timestamp",
        ),
    ]

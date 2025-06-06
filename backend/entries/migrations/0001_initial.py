# Generated by Django 5.0.4 on 2024-07-03 15:26

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Entry",
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
                ("name", models.CharField()),
                ("description", models.TextField(blank=True, null=True)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("actor", "Actor"),
                            ("entity", "Entity"),
                            ("artifact", "Artifact"),
                            ("metadata", "Metadata"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "subtype",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("ip", "IP Address"),
                            ("domain", "Domain Name"),
                            ("url", "URL"),
                            ("username", "Username"),
                            ("password", "Password"),
                            ("social", "Social Media"),
                            ("hash", "Hash"),
                            ("tool", "Tool Name"),
                            ("cve", "CVE"),
                            ("ttp", "TTP"),
                            ("malware", "Malware"),
                            ("campaign", "Campaign"),
                            ("family", "Family"),
                            ("crime", "Crime Type"),
                            ("industry", "Industry"),
                            ("country", "Country"),
                            ("company", "Company"),
                        ],
                        max_length=20,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="entry",
            constraint=models.UniqueConstraint(
                fields=("name", "type", "subtype"), name="unique_name_type_subtype"
            ),
        ),
    ]

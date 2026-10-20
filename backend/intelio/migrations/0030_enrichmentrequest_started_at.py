from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("intelio", "0029_alter_enrichmentrequest_entities"),
    ]

    operations = [
        migrations.AddField(
            model_name="enrichmentrequest",
            name="started_at",
            field=models.DateTimeField(blank=True, help_text="When enrichment last started", null=True),
        ),
    ]

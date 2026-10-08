# Generated manually — entities on enrichment requests are optional.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("intelio", "0028_enrichmentrequest_single_artifact"),
    ]

    operations = [
        migrations.AlterField(
            model_name="enrichmentrequest",
            name="entities",
            field=models.ManyToManyField(
                blank=True,
                help_text="Optional entity entries for access control (who may see this request)",
                related_name="enrichment_requests",
                to="entries.entry",
            ),
        ),
    ]

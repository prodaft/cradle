from django.db import models

from ..base import BaseEnricher


class OpenCTIEnricher(BaseEnricher):
    """Enriches observables with OpenCTI threat intelligence data.

    Supported entry classes: all.
    Execution runs inside an isolated container (enrichers/opencti/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "OpenCTI"

    settings_fields = {
        "api_key": models.CharField(max_length=255, help_text="OpenCTI API token"),
        "instance_url": models.URLField(help_text="OpenCTI instance URL (e.g., https://demo.opencti.io)"),
        "ssl_verify": models.BooleanField(default=True, blank=True, help_text="Verify SSL certificates"),
        "exact_search": models.BooleanField(default=True, blank=True, help_text="Only return exact matches"),
        "timeout": models.IntegerField(default=30, help_text="API request timeout in seconds"),
        "extract_observables": models.BooleanField(
            default=False,
            blank=True,
            help_text="Extract related observables from reports as separate entries",
        ),
    }

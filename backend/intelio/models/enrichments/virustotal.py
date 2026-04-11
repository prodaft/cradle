from django.db import models

from ..base import BaseEnricher


class VirusTotalEnricher(BaseEnricher):
    """Enriches file hashes with VirusTotal scan results.

    Supported entry classes: hash (MD5, SHA1, SHA256).
    Execution runs inside an isolated container (enrichers/virustotal/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "VirusTotal"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="VirusTotal API key (get from https://www.virustotal.com/gui/my-apikey)",
        ),
        "timeout": models.IntegerField(default=30, help_text="API request timeout in seconds"),
        "min_detections": models.IntegerField(
            default=1,
            help_text="Minimum detections to create relation (0 = always create)",
        ),
    }

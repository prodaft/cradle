from django.db import models

from ..base import BaseEnricher


class MISPEnricher(BaseEnricher):
    """Enriches observables with MISP (Malware Information Sharing Platform) data.

    Supported entry classes: ip, domain, url, hash, email.
    Execution runs inside an isolated container (enrichers/misp/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "MISP"

    settings_fields = {
        "api_key": models.CharField(max_length=255, help_text="MISP API key"),
        "instance_url": models.URLField(help_text="MISP instance URL (e.g., https://misp.example.com)"),
        "ssl_verify": models.BooleanField(default=True, help_text="Verify SSL certificates"),
        "debug": models.BooleanField(default=False, help_text="Enable debug mode for PyMISP"),
        "from_days": models.IntegerField(default=0, help_text="Search events from N days ago (0 = no time filter)"),
        "limit": models.IntegerField(default=100, help_text="Maximum number of results to return"),
        "enforce_warninglist": models.BooleanField(default=False, help_text="Enforce MISP warninglists"),
        "filter_on_type": models.BooleanField(default=True, help_text="Filter results by observable type"),
        "strict_search": models.BooleanField(default=True, help_text="Use exact match search"),
        "published": models.BooleanField(default=False, help_text="Only return published events"),
        "metadata": models.BooleanField(default=False, help_text="Only return event metadata"),
        "timeout": models.IntegerField(default=5, help_text="API request timeout in seconds"),
        "extract_artifacts": models.BooleanField(
            default=False, help_text="Extract related IPs, domains, and hashes from MISP attributes"
        ),
    }

from django.db import models

from ..base import BaseEnricher


class AbuseIPDBEnricher(BaseEnricher):
    """Enriches IP addresses with AbuseIPDB reputation data.

    Supported entry classes: ip (IPv4), ipv6.
    Execution runs inside an isolated container (enrichers/abuseipdb/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "AbuseIPDB"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="AbuseIPDB API key from https://www.abuseipdb.com/account/api",
        ),
        "max_age": models.IntegerField(default=90, help_text="Maximum age of reports in days (1-365)"),
        "max_reports": models.IntegerField(default=100, help_text="Maximum number of reports to include in results"),
        "verbose": models.BooleanField(default=False, help_text="Include detailed report information"),
    }

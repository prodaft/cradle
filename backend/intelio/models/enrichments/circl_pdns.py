from django.db import models

from ..base import BaseEnricher


class CIRCLPDNSEnricher(BaseEnricher):
    """Enriches domains with passive DNS data from CIRCL.

    Supported entry classes: domain, url (extracts hostname).
    Execution runs inside an isolated container (enrichers/circl_pdns/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "CIRCL PDNS"

    settings_fields = {
        "username": models.CharField(max_length=255, help_text="CIRCL PDNS username"),
        "password": models.CharField(max_length=255, help_text="CIRCL PDNS password"),
        "timeout": models.IntegerField(default=5, help_text="Query timeout in seconds"),
    }

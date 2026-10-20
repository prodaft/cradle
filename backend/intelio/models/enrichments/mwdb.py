from django.db import models

from ..base import BaseEnricher


class MWDBEnricher(BaseEnricher):
    """Enriches file hashes with MWDB (Malware Database) information.

    Supported entry classes: hash (MD5, SHA1, SHA256, SHA512).
    Execution runs inside an isolated container (enrichers/mwdb/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "MWDB"

    settings_fields = {
        "api_key": models.CharField(max_length=255, help_text="MWDB API key from https://mwdb.cert.pl/"),
        "mwdb_url": models.URLField(default="https://mwdb.cert.pl", help_text="MWDB instance URL"),
        "extract_hashes": models.BooleanField(
            default=True,
            blank=True,
            help_text="Extract related hashes (parents, children) as separate entries",
        ),
    }

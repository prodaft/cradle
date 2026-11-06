"""IntelIO Django app: threat intelligence ingestion, enrichment, and mappings."""

from django.apps import AppConfig


class IntelIOConfig(AppConfig):
    """App config for intelio: digests, enrichers, and external type mappings."""

    name = "intelio"

"""Utilities for intelio: enricher settings lookup and defaults."""

from .models.base import BaseEnricher, EnricherSettings


def get_or_default_enricher(enricher_type: str):
    """Retrieve EnricherSettings for a given enricher type, or return a default instance.

    Args:
        enricher_type: Class name of the enricher (e.g. "AbuseIPDBEnricher").

    Returns:
        EnricherSettings instance with stored or default settings, or None if
        enricher_type is unknown.
    """
    try:
        return EnricherSettings.objects.get(enricher_type=enricher_type)
    except EnricherSettings.DoesNotExist:
        config = BaseEnricher.get_subclass(enricher_type)
        if config is None:
            return None

        default_settings = config.get_default_settings()

        return EnricherSettings(
            enricher_type=enricher_type,
            settings=default_settings,
        )

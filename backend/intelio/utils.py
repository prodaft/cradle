from .models.base import EnricherSettings
from .models.base import BaseEnricher


def get_or_default_enricher(enricher_type):
    """
    Retrieve an enricher for a given entry class and type,
    or return a default instance with empty settings.
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

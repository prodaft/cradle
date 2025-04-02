from django.db import models

from .models.base import EnricherSettings
from .models.base import BaseEnricher


def fields_to_form(fields):
    field_mapping = {}
    for name, field in fields.items():
        if field.primary_key:
            continue
        if isinstance(field, models.CharField):
            field_type = "string"
            options = None
            if hasattr(field, "choices") and field.choices:
                field_type = "options"
                options = [choice[0] for choice in field.choices]
        elif isinstance(field, models.IntegerField) or isinstance(
            field, models.FloatField
        ):
            field_type = "number"
            options = None
        else:
            continue

        field_mapping[name] = {
            "type": field_type,
            "options": options,
            "required": not field.null and not field.blank,
            "default": field.default
            if field.default != models.fields.NOT_PROVIDED
            else None,
        }

    return field_mapping


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

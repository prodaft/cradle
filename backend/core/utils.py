"""Shared utilities for model introspection and query parameter validation.

Provides flatten, fields_to_form (Django model → form schema), and
validate_order_by for order_by query parameter validation.
"""

import itertools

from django.db import models

from .exceptions import InvalidRequestException


def flatten(items):
    """Flatten an iterable of iterables into a single list. Thin wrapper over itertools.chain.from_iterable."""
    return list(itertools.chain.from_iterable(items))


def fields_to_form(fields):
    """Convert Django model field definitions to a form schema dict.

    Args:
        fields: Dict mapping field names to Django model field instances.

    Returns:
        Dict with type, options, description, required, default per field.
        Skips primary keys and unsupported field types.
    """
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
        elif isinstance(field, models.IntegerField) or isinstance(field, models.FloatField):
            field_type = "number"
            options = None
        elif isinstance(field, models.BooleanField):
            field_type = "boolean"
            options = None
        elif isinstance(field, models.URLField):
            field_type = "url"
            options = None
        else:
            continue

        if hasattr(field, "help_text"):
            description = field.help_text
        else:
            description = None

        field_mapping[name] = {
            "type": field_type,
            "options": options,
            "description": description,
            "required": not field.null and not field.blank,
            "default": (field.default if field.default != models.fields.NOT_PROVIDED else None),
        }

    return field_mapping


def validate_order_by(order_by: str | None, valid_fields: list[str]) -> list[str]:
    """Validate and parse the order_by parameter.

    Args:
        order_by: The order_by string from query parameters (None or empty returns []).
        valid_fields: List of valid field names for ordering.

    Returns:
        List of validated order fields. Empty list if order_by is None/empty/whitespace.

    Raises:
        InvalidRequestException: When an invalid field is specified.
    """
    if not order_by or not str(order_by).strip():
        return []

    order_fields = []
    for field in order_by.split(","):
        field = field.strip()
        if not field:
            continue
        if field.startswith("-"):
            base_field = field[1:]
        else:
            base_field = field

        if base_field in valid_fields:
            order_fields.append(field)
        else:
            raise InvalidRequestException(
                detail=f"Invalid order_by field: {base_field}. Valid fields are: {', '.join(valid_fields)}"
            )

    return order_fields

from django.db import models
from rest_framework.response import Response
from rest_framework import status
from typing import List, Optional, Tuple


def flatten(items):
    flat_list = []
    for row in items:
        flat_list += row
    return flat_list


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
            "default": (
                field.default if field.default != models.fields.NOT_PROVIDED else None
            ),
        }

    return field_mapping


def validate_order_by(
    order_by: str, valid_fields: List[str]
) -> Tuple[Optional[List[str]], Optional[Response]]:
    """
    Validate and parse the order_by parameter.

    Args:
        order_by: The order_by string from query parameters
        valid_fields: List of valid field names for ordering

    Returns:
        Tuple of (order_fields, error_response)
        - order_fields: List of validated order fields (None if error)
        - error_response: DRF Response object if validation failed (None if success)
    """
    order_fields = []

    for field in order_by.split(","):
        field = field.strip()
        if field.startswith("-"):
            base_field = field[1:]
        else:
            base_field = field

        if base_field in valid_fields:
            order_fields.append(field)
        else:
            error_response = Response(
                f"Invalid order_by field: {base_field}. Valid fields are: {', '.join(valid_fields)}",
                status=status.HTTP_400_BAD_REQUEST,
            )
            return None, error_response

    return order_fields, None

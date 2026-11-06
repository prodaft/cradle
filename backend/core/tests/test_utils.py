"""Tests for core request-parameter helpers."""

import pytest

from core.exceptions import InvalidRequestException
from core.utils import validate_order_by


def test_validate_order_by_list_keeps_field_names():
    """A list of valid fields passes names through unchanged."""
    assert validate_order_by("-title,created_at", ["title", "created_at"]) == ["-title", "created_at"]


def test_validate_order_by_mapping_translates_to_model_fields():
    """A mapping translates API field names to model fields, keeping the direction."""
    fields = {"name": "file_name", "size": "file_size"}

    assert validate_order_by("-name, size", fields) == ["-file_name", "file_size"]


def test_validate_order_by_mapping_rejects_model_field_names():
    """Model field names are not accepted when they are not API field names."""
    with pytest.raises(InvalidRequestException):
        validate_order_by("-file_name", {"name": "file_name"})


def test_validate_order_by_empty_returns_empty_list():
    """Blank order_by yields no ordering."""
    assert validate_order_by("  ", {"name": "file_name"}) == []

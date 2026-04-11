"""Serialization helpers for the enricher container boundary.

The Celery worker serializes ORM objects to plain dicts *before* launching a
container, and deserializes the container's stdout JSON *after* it exits.  No
Django models or database connections cross the boundary.

Stdout contract (``EnricherResult`` JSON):

.. code-block:: json

    {
        "relations": [
            {
                "e1_name": "abc123",
                "e1_class": "hash",
                "e2_name": "Enrichment Request Title [uuid]",
                "e2_class": "__enrichment__",
                "details": {},
                "inherit_av": true
            }
        ],
        "warnings": ["..."],
        "errors": []
    }
"""

import json
from typing import Any

from pydantic import BaseModel, Field


class RelationSpec(BaseModel):
    """A single relation to be created in the database after the container exits."""

    e1_name: str
    e1_class: str
    e2_name: str
    e2_class: str
    details: dict[str, Any] = Field(default_factory=dict)
    inherit_av: bool = True


class EnricherResult(BaseModel):
    """The full result envelope written to stdout by a container enricher."""

    relations: list[RelationSpec] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


def serialize_job(
    enricher_type: str,
    settings: dict,
    entries: list,
    enrichment_entry_name: str,
    enrichment_entry_class: str,
    dns_typemapping: dict[str, str] | None = None,
) -> str:
    """Serialize the enrichment job to a JSON string for container stdin.

    Args:
        enricher_type: Python class name of the enricher (e.g. ``"DNSEnricher"``).
        settings: Enricher-specific configuration dict from ``EnricherSettings.settings``.
        entries: List of ORM ``Entry`` objects to enrich.
        enrichment_entry_name: ``entry.name`` of the ``EnrichmentRequest.entry`` sentinel.
        enrichment_entry_class: ``entry.entry_class.subtype`` of the sentinel entry.
        dns_typemapping: Optional mapping of DNS record type → CRADLE subtype string,
            used by DNS-based enrichers that cannot query the DB.

    Returns:
        A UTF-8 JSON string.
    """
    serialized_entries = [
        {
            "name": e.name,
            "entry_class": e.entry_class.subtype,
        }
        for e in entries
    ]

    payload: dict[str, Any] = {
        "enricher_type": enricher_type,
        "settings": settings,
        "entries": serialized_entries,
        "enrichment_entry": {
            "name": enrichment_entry_name,
            "entry_class": enrichment_entry_class,
        },
    }

    if dns_typemapping is not None:
        payload["dns_typemapping"] = dns_typemapping

    return json.dumps(payload)


def deserialize_result(raw: str) -> EnricherResult:
    """Parse and validate the JSON written to stdout by a container enricher.

    Args:
        raw: Raw stdout string from the container.

    Returns:
        A validated :class:`EnricherResult`.

    Raises:
        ``pydantic.ValidationError``: If the JSON does not match the schema.
        ``json.JSONDecodeError``: If ``raw`` is not valid JSON.
    """
    data = json.loads(raw)
    return EnricherResult.model_validate(data)

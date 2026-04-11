"""MISP enricher container.

Queries a MISP instance for matching attributes and events.
MISP type mappings are passed in the job payload (no DB access).
Network requirement: external (needs outbound HTTPS to MISP instance).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import datetime

import pymisp
from _base.enricher_base import enrichment_entry, main, make_relation

OPENCTI_RESULT_TRIM_OBSERVABLE = [
    "objectMarkingIds",
    "objectLabelIds",
    "externalReferencesIds",
    "indicatorsIds",
    "parent_types",
]


def _get_misp_types_for_class(entry_class: str, misp_typemapping: dict[str, list[str]]) -> list[str]:
    """Return MISP attribute types for a given CRADLE entry class subtype."""
    return misp_typemapping.get(entry_class, [])


def _build_search_params(entry: dict, settings: dict, misp_typemapping: dict[str, list[str]]) -> dict:
    params: dict = {"limit": settings.get("limit", 100)}

    if settings.get("enforce_warninglist"):
        params["enforce_warninglist"] = True
    if settings.get("published"):
        params["published"] = True
    if settings.get("metadata"):
        params["metadata"] = True

    if settings.get("strict_search", True):
        params["value"] = entry["name"]
    else:
        params["searchall"] = f"%{entry['name']}%"

    from_days = settings.get("from_days", 0)
    if from_days > 0:
        date_from = datetime.datetime.utcnow() - datetime.timedelta(days=from_days)
        params["date_from"] = date_from.strftime("%Y-%m-%d %H:%M:%S")

    if settings.get("filter_on_type", True):
        misp_types = _get_misp_types_for_class(entry["entry_class"], misp_typemapping)
        if misp_types:
            params["type_attribute"] = misp_types

    return params


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)
    # misp_typemapping: {cradle_subtype: [misp_attr_type, ...]}
    misp_typemapping: dict[str, list[str]] = job.get("misp_typemapping") or {}
    # misp_rev_typemapping: {misp_attr_type: cradle_subtype}
    misp_rev_typemapping: dict[str, str] = job.get("misp_rev_typemapping") or {}

    api_key = settings.get("api_key", "")
    instance_url = settings.get("instance_url", "")
    ssl_verify = settings.get("ssl_verify", True)
    debug = settings.get("debug", False)
    timeout = settings.get("timeout", 5)
    extract_artifacts = settings.get("extract_artifacts", False)

    if not api_key:
        return {"relations": [], "warnings": [], "errors": ["Add your MISP API key before running this enrichment."]}
    if not instance_url:
        return {"relations": [], "warnings": [], "errors": ["Add your MISP server URL before running this enrichment."]}

    warnings = []
    relations = []

    if not misp_typemapping:
        warnings.append(
            "No MISP type mappings are configured. "
            "Type filtering and artifact extraction will be disabled until an administrator adds them in the admin site."
        )

    try:
        misp_instance = pymisp.PyMISP(
            url=instance_url,
            key=api_key,
            ssl=ssl_verify,
            debug=debug,
            timeout=timeout,
        )
    except Exception as exc:
        return {"relations": [], "warnings": [], "errors": [f"Could not connect to MISP: {exc}"]}

    for entry in entries:
        try:
            params = _build_search_params(entry, settings, misp_typemapping)
            result_search = misp_instance.search(**params)

            if isinstance(result_search, dict):
                errors = result_search.get("errors", [])
                if errors:
                    warnings.append(f"MISP search returned errors for {entry['name']}: {errors}")
                    continue

            result = {
                "result_search": result_search,
                "instance_url": instance_url,
                "total_results": len(result_search) if isinstance(result_search, list) else 0,
            }

            relations.append(
                make_relation(
                    e1_name=entry["name"],
                    e1_class=entry["entry_class"],
                    e2_name=sentinel["name"],
                    e2_class=sentinel["entry_class"],
                    details=result,
                )
            )

            if extract_artifacts and isinstance(result_search, list):
                unmapped_types: set[str] = set()
                for event in result_search:
                    if not isinstance(event, dict):
                        continue
                    event_data = event.get("Event", {})
                    for attr in event_data.get("Attribute", []):
                        if not isinstance(attr, dict):
                            continue
                        attr_type = attr.get("type", "")
                        attr_value = attr.get("value", "")
                        if not attr_value or attr_value == entry["name"]:
                            continue
                        target_class = misp_rev_typemapping.get(attr_type)
                        if target_class:
                            relations.append(
                                make_relation(
                                    e1_name=entry["name"],
                                    e1_class=entry["entry_class"],
                                    e2_name=attr_value,
                                    e2_class=target_class,
                                    details={
                                        "source": "misp_attribute",
                                        "event_id": event_data.get("id", ""),
                                        "event_info": event_data.get("info", ""),
                                        "attribute_type": attr_type,
                                        "attribute_category": attr.get("category", ""),
                                    },
                                )
                            )
                        elif attr_type:
                            unmapped_types.add(attr_type)

                if unmapped_types:
                    warnings.append(
                        f"Some MISP attribute types were skipped because no mapping exists for them: "
                        f"{', '.join(sorted(unmapped_types))}. "
                        f"An administrator can add MISP type mappings in the admin site."
                    )

        except Exception as exc:
            warnings.append(f"MISP query failed for {entry['name']}: {exc}")

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

"""OpenCTI enricher container.

Queries an OpenCTI instance for STIX cyber observables and linked reports.
OpenCTI type mappings are passed in the job payload (no DB access).
Network requirement: external (needs outbound HTTPS to OpenCTI instance).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pycti
from _base.enricher_base import enrichment_entry, main, make_relation
from pycti.api.opencti_api_client import File

TRIM_OBSERVABLE = [
    "objectMarkingIds",
    "objectLabelIds",
    "externalReferencesIds",
    "indicatorsIds",
    "parent_types",
]

TRIM_REPORT = {
    "objects",
    "objectMarkingIds",
    "externalReferencesIds",
    "objectLabelIds",
    "parent_types",
    "objectsIds",
    "x_opencti_graph_data",
}


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)
    # opencti_rev_typemapping: {opencti_entity_type: cradle_subtype}
    opencti_rev_typemapping: dict[str, str] = job.get("opencti_rev_typemapping") or {}

    api_key = settings.get("api_key", "")
    instance_url = settings.get("instance_url", "")
    ssl_verify = settings.get("ssl_verify", True)
    exact_search = settings.get("exact_search", True)
    extract_observables = settings.get("extract_observables", False)

    if not api_key:
        return {"relations": [], "warnings": [], "errors": ["Add your OpenCTI API key before running this enrichment."]}
    if not instance_url:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your OpenCTI server URL before running this enrichment."],
        }

    warnings = []
    relations = []

    if extract_observables and not opencti_rev_typemapping:
        warnings.append(
            "No OpenCTI type mappings are configured. "
            "Observable extraction will be disabled until an administrator adds them in the admin site."
        )

    try:
        opencti_instance = pycti.OpenCTIApiClient(
            url=instance_url,
            token=api_key,
            ssl_verify=ssl_verify,
            proxies={},
        )
    except Exception as exc:
        return {"relations": [], "warnings": [], "errors": [f"Could not connect to OpenCTI: {exc}"]}

    for entry in entries:
        try:
            observables = pycti.StixCyberObservable(opencti_instance, File).list(search=entry["name"])

            if exact_search:
                observables = [obs for obs in observables if obs.get("observable_value") == entry["name"]]

            for observable in observables:
                try:
                    reports = pycti.Report(opencti_instance).list(
                        filters=[{"key": "objectContains", "values": [observable["id"]]}]
                    )
                    for key in TRIM_OBSERVABLE:
                        observable.pop(key, None)
                    for report in reports:
                        for key in TRIM_REPORT:
                            report.pop(key, None)
                    observable["reports"] = reports
                except Exception:
                    observable["reports"] = []
                    observable["error"] = "Related reports could not be loaded."

            result = {
                "observables": observables,
                "total_observables": len(observables),
                "instance_url": instance_url,
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

            if extract_observables and opencti_rev_typemapping:
                for observable in observables:
                    entity_type = observable.get("entity_type", "")
                    obs_value = observable.get("observable_value", "")
                    if not obs_value or obs_value == entry["name"]:
                        continue
                    target_class = opencti_rev_typemapping.get(entity_type)
                    if target_class:
                        relations.append(
                            make_relation(
                                e1_name=entry["name"],
                                e1_class=entry["entry_class"],
                                e2_name=obs_value,
                                e2_class=target_class,
                                details={
                                    "source": "opencti_observable",
                                    "entity_type": entity_type,
                                    "observable_id": observable.get("id", ""),
                                },
                            )
                        )

        except Exception as exc:
            warnings.append(f"OpenCTI query failed for {entry['name']}: {exc}")

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

"""URLScan.io enricher container.

Searches existing scans or submits new scans for URLs and domains.
URLScan type mappings are passed in the job payload (no DB access).
Network requirement: external (needs outbound HTTPS to urlscan.io).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time

import requests
from _base.enricher_base import enrichment_entry, main, make_relation

API_URL = "https://urlscan.io/api/v1"


def _urlscan_search(entry: dict, headers: dict, timeout: int, search_size: int) -> dict:
    entry_class = entry["entry_class"]
    name = entry["name"]

    if entry_class == "url":
        query = f'page.url:"{name}"'
    elif entry_class == "domain":
        query = f'domain:"{name}"'
    else:
        query = f'"{name}"'

    response = requests.get(
        f"{API_URL}/search/",
        params={"q": query, "size": search_size},
        headers=headers,
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def _poll_for_result(api_url: str, headers: dict, timeout: int) -> dict:
    max_tries = 10
    poll_distance = 2
    result = {}

    time.sleep(10)

    for attempt in range(max_tries):
        if attempt > 0:
            time.sleep(poll_distance)
        try:
            resp = requests.get(api_url, headers=headers, timeout=timeout)
            if resp.status_code == 404:
                continue
            resp.raise_for_status()
            result = resp.json()
            break
        except requests.RequestException:
            continue

    return result


def _urlscan_submit_and_poll(entry: dict, headers: dict, timeout: int, visibility: str) -> dict:
    data = {"url": entry["name"], "visibility": visibility}
    response = requests.post(f"{API_URL}/scan/", json=data, headers=headers, timeout=timeout)

    if response.status_code == 400:
        raise requests.HTTPError(response.json().get("description", "Bad request"))

    response.raise_for_status()
    api_url = response.json().get("api", "")
    if not api_url:
        return {}

    return _poll_for_result(api_url, headers, timeout)


def _create_artifact_relations(
    source_entry: dict,
    page_data: dict,
    urlscan_typemapping: dict[str, str],
) -> tuple[list, list]:
    field_mapping = {
        "domain": "domain",
        "ip": "ip",
        "url": "url",
        "asn": "asn",
        "country": "country",
        "server": "server",
    }

    relations = []
    unmapped_types = []

    for field_name, observable_type in field_mapping.items():
        value = page_data.get(field_name)
        if not value or value == source_entry["name"]:
            continue

        target_class = urlscan_typemapping.get(observable_type)
        if target_class:
            relations.append(
                make_relation(
                    e1_name=source_entry["name"],
                    e1_class=source_entry["entry_class"],
                    e2_name=str(value),
                    e2_class=target_class,
                    details={
                        "source": "urlscan_page_data",
                        "field": field_name,
                        "discovered_from": source_entry["name"],
                    },
                )
            )
        else:
            unmapped_types.append(observable_type)

    return relations, unmapped_types


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)
    urlscan_typemapping: dict[str, str] = job.get("urlscan_typemapping") or {}

    api_key = settings.get("api_key", "")
    analysis_mode = settings.get("analysis_mode", "search")
    timeout = settings.get("timeout", 30)
    search_size = settings.get("search_size", 10)
    visibility = settings.get("visibility", "public")
    extract_artifacts = settings.get("extract_artifacts", True)

    if analysis_mode == "submit_result" and not api_key:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your URLScan API key before submitting a URL for scanning."],
        }

    headers = {"Content-Type": "application/json", "User-Agent": "CRADLE/v1.x"}
    if api_key:
        headers["API-Key"] = api_key

    warnings = []
    relations = []

    if extract_artifacts and not urlscan_typemapping:
        warnings.append(
            "No URLScan type mappings are configured. "
            "Artifact extraction will be disabled until an administrator adds them in the admin site."
        )

    for entry in entries:
        try:
            if analysis_mode == "search":
                result = _urlscan_search(entry, headers, timeout, search_size)
            elif analysis_mode == "submit_result":
                result = _urlscan_submit_and_poll(entry, headers, timeout, visibility)
            else:
                warnings.append("This analysis mode is not supported. Use search or submit result.")
                continue

            if not result:
                continue

            relations.append(
                make_relation(
                    e1_name=entry["name"],
                    e1_class=entry["entry_class"],
                    e2_name=sentinel["name"],
                    e2_class=sentinel["entry_class"],
                    details=result,
                )
            )

            if extract_artifacts and urlscan_typemapping:
                all_unmapped: list[str] = []

                if "results" in result:
                    for scan in result.get("results", []):
                        page = scan.get("page", {})
                        artifact_rels, unmapped = _create_artifact_relations(entry, page, urlscan_typemapping)
                        relations.extend(artifact_rels)
                        all_unmapped.extend(unmapped)
                elif "page" in result:
                    artifact_rels, unmapped = _create_artifact_relations(entry, result["page"], urlscan_typemapping)
                    relations.extend(artifact_rels)
                    all_unmapped.extend(unmapped)

                if all_unmapped:
                    warnings.append(
                        f"Some observable types were skipped because no mapping exists for them: "
                        f"{', '.join(set(all_unmapped))}. "
                        f"An administrator can add URLScan type mappings in the admin site."
                    )

        except requests.RequestException as exc:
            warnings.append(f"URLScan API request failed for {entry['name']}: {exc}")
        except Exception as exc:
            warnings.append(f"URLScan enrichment failed for {entry['name']}: {exc}")

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

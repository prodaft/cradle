"""VirusTotal enricher container.

Queries the VirusTotal v2 API for file hash reputation data.
Network requirement: external (needs outbound HTTPS to virustotal.com).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from _base.enricher_base import enrichment_entry, main, make_relation

VT_API_URL = "https://www.virustotal.com/vtapi/v2/file/report"


def _detect_hash_type(hash_string: str) -> str | None:
    length = len(hash_string)
    if length == 32:
        return "md5"
    if length == 40:
        return "sha1"
    if length == 64:
        return "sha256"
    return None


def _extract_positives(result: dict) -> list:
    positives = []
    for engine, scan_result in result.get("scans", {}).items():
        if scan_result.get("detected"):
            positives.append({"engine": engine, "result": scan_result.get("result", "")})
    return positives[:10]


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)

    api_key = settings.get("api_key", "")
    timeout = settings.get("timeout", 30)
    min_detections = settings.get("min_detections", 1)

    if not api_key:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your VirusTotal API key before running this enrichment."],
        }

    relations = []
    warnings = []

    for entry in entries:
        hash_type = _detect_hash_type(entry["name"])
        if not hash_type:
            warnings.append(f"Could not determine hash type for {entry['name']}.")
            continue

        try:
            response = requests.get(
                VT_API_URL,
                params={"apikey": api_key, "resource": entry["name"]},
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            warnings.append(f"VirusTotal API request failed for {entry['name']}: {exc}")
            continue

        if data.get("response_code") != 1:
            warnings.append(f"No VirusTotal data found for {entry['name']}.")
            continue

        detections = data.get("positives", 0)
        if detections < min_detections:
            continue

        details = {
            "hash_type": hash_type,
            "detections": detections,
            "total_engines": data.get("total", 0),
            "scan_date": data.get("scan_date", ""),
            "positives": _extract_positives(data),
            "permalink": data.get("permalink", ""),
        }

        relations.append(
            make_relation(
                e1_name=entry["name"],
                e1_class=entry["entry_class"],
                e2_name=sentinel["name"],
                e2_class=sentinel["entry_class"],
                details=details,
            )
        )

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

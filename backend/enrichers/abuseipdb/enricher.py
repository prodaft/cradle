"""AbuseIPDB enricher container.

Queries the AbuseIPDB v2 API for IP reputation data.
Network requirement: external (needs outbound HTTPS to api.abuseipdb.com).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from _base.enricher_base import enrichment_entry, main, make_relation

API_URL = "https://api.abuseipdb.com/api/v2/check"

CATEGORY_MAPPING = {
    1: "DNS Compromise",
    2: "DNS Poisoning",
    3: "Fraud Orders",
    4: "DDOS Attack",
    5: "FTP Brute-Force",
    6: "Ping of Death",
    7: "Phishing",
    8: "Fraud VOIP",
    9: "Open Proxy",
    10: "Web Spam",
    11: "Email Spam",
    12: "Blog Spam",
    13: "VPN IP",
    14: "Port Scan",
    15: "Hacking",
    16: "SQL Injection",
    17: "Spoofing",
    18: "Brute Force",
    19: "Bad Web Bot",
    20: "Exploited Host",
    21: "Web App Attack",
    22: "SSH",
    23: "IoT Targeted",
}


def _process_reports(reports: list) -> dict:
    categories_found: dict[str, int] = {}
    for report in reports:
        report["categories_human_readable"] = []
        for category in report.get("categories", []):
            name = CATEGORY_MAPPING.get(category, "unknown category")
            report["categories_human_readable"].append(name)
            categories_found[name] = categories_found.get(name, 0) + 1
    return categories_found


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)

    api_key = settings.get("api_key", "")
    max_age = settings.get("max_age", 90)
    max_reports = settings.get("max_reports", 100)
    verbose = settings.get("verbose", False)

    if not api_key:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your AbuseIPDB API key before running this enrichment."],
        }

    relations = []
    warnings = []

    for entry in entries:
        try:
            headers = {"Key": api_key, "Accept": "application/json"}
            params = {
                "ipAddress": entry["name"],
                "maxAgeInDays": max_age,
                "verbose": verbose,
            }
            response = requests.get(API_URL, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
        except requests.RequestException as exc:
            warnings.append(f"AbuseIPDB API request failed for {entry['name']}: {exc}")
            continue

        reports = result.get("data", {}).get("reports", [])
        categories_found = _process_reports(reports)

        details = {
            "abuse_confidence_score": result.get("data", {}).get("abuseConfidenceScore", 0),
            "total_reports": result.get("data", {}).get("totalReports", 0),
            "is_whitelisted": result.get("data", {}).get("isWhitelisted", False),
            "categories_found": categories_found,
            "reports": reports[:max_reports],
            "permalink": f"https://www.abuseipdb.com/check/{entry['name']}",
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

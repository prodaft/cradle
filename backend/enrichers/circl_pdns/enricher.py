"""CIRCL Passive DNS enricher container.

Queries the CIRCL PDNS service for historical DNS records.
DNS type mappings are passed in the job payload (no DB access).
Network requirement: external (needs outbound HTTPS to circl.lu).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from urllib.parse import urlparse

import pypdns
from _base.enricher_base import main, make_relation

PDNS_URL = "https://www.circl.lu/pdns/query"


def _extract_domain(entry: dict) -> str | None:
    if entry["entry_class"] == "url":
        try:
            return urlparse(entry["name"]).hostname
        except Exception:
            return None
    return entry["name"]


def _format_timestamp(timestamp) -> str:
    if timestamp is None:
        return ""
    if hasattr(timestamp, "strftime"):
        return timestamp.strftime("%Y-%m-%d %H:%M:%S")
    return str(timestamp)


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    dns_typemapping: dict[str, str] = job.get("dns_typemapping") or {}

    username = settings.get("username", "")
    password = settings.get("password", "")
    timeout = settings.get("timeout", 5)

    if not username:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your CIRCL PDNS username before running this enrichment."],
        }
    if not password:
        return {
            "relations": [],
            "warnings": [],
            "errors": ["Add your CIRCL PDNS password before running this enrichment."],
        }

    warnings = []
    relations = []

    if not dns_typemapping:
        warnings.append(
            "No DNS type mappings are configured. "
            "IP address extraction will be disabled until an administrator adds them in the admin site."
        )

    try:
        pdns = pypdns.PyPDNS(url=PDNS_URL, basic_auth=(username, password))
    except Exception as exc:
        return {
            "relations": [],
            "warnings": [],
            "errors": [f"Could not connect to CIRCL PDNS: {exc}"],
        }

    unmapped_types: set[str] = set()

    for entry in entries:
        domain = _extract_domain(entry)
        if not domain:
            warnings.append(f"Could not extract a domain from entry: {entry['name']}")
            continue

        try:
            results = pdns.query(domain, timeout=timeout)
        except pypdns.errors.UnauthorizedError:
            return {
                "relations": relations,
                "warnings": warnings,
                "errors": ["CIRCL PDNS authentication failed. Check credentials."],
            }
        except Exception as exc:
            warnings.append(f"CIRCL PDNS lookup failed for {domain}: {exc}")
            continue

        for record in results:
            record_type = record.get("rrtype", "")
            if not record_type:
                continue

            target_class = dns_typemapping.get(record_type)
            if not target_class:
                unmapped_types.add(record_type)
                continue

            rdata = record.get("rdata")
            if not rdata:
                continue

            relations.append(
                make_relation(
                    e1_name=entry["name"],
                    e1_class=entry["entry_class"],
                    e2_name=rdata,
                    e2_class=target_class,
                    details={
                        "record_type": record_type,
                        "time_first": _format_timestamp(record.get("time_first")),
                        "time_last": _format_timestamp(record.get("time_last")),
                        "count": record.get("count", 0),
                        "source": "circl_pdns",
                    },
                )
            )

    if unmapped_types:
        warnings.append(
            f"Some DNS record types were skipped because no mapping exists for them: "
            f"{', '.join(sorted(unmapped_types))}. "
            f"An administrator can add DNS type mappings in the admin site."
        )

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl
from typing import Optional

import requests
from django.db import models

from entries.enums import RelationReason
from entries.models import Entry, Relation

from ..base import BaseEnricher


class AbuseIPDBEnricher(BaseEnricher):
    """Enriches IP addresses with AbuseIPDB reputation data.

    Queries the AbuseIPDB API to retrieve abuse reports and confidence scores
    for IP addresses. Creates relations with reputation metadata.

    Supported entry classes:
    - ip (IPv4 addresses)
    - ipv6 (IPv6 addresses)

    API Documentation: https://docs.abuseipdb.com/
    Rate Limit: 1000 requests/day (free tier)

    Relation details schema:
    {
        "abuse_confidence_score": int,    # 0-100 confidence score
        "total_reports": int,             # Total number of abuse reports
        "is_whitelisted": bool,           # Whether IP is whitelisted
        "categories_found": {             # Abuse categories and counts
            "category_name": int
        },
        "reports": [                      # Recent abuse reports (limited)
            {
                "reportedAt": str,
                "comment": str,
                "categories": [int],
                "categories_human_readable": [str]
            }
        ],
        "permalink": str                  # Link to AbuseIPDB report
    }
    """

    display_name = "AbuseIPDB"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="AbuseIPDB API key from https://www.abuseipdb.com/account/api",
        ),
        "max_age": models.IntegerField(default=90, help_text="Maximum age of reports in days (1-365)"),
        "max_reports": models.IntegerField(default=100, help_text="Maximum number of reports to include in results"),
        "verbose": models.BooleanField(default=False, help_text="Include detailed report information"),
    }

    API_URL = "https://api.abuseipdb.com/api/v2/check"

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        if not self.settings.get("api_key"):
            return "AbuseIPDB API key is required"

        if not entries:
            return "No entries provided for enrichment"

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich IP addresses with AbuseIPDB reputation data."""
        api_key = self.settings["api_key"]
        max_age = self.settings.get("max_age", 90)
        max_reports = self.settings.get("max_reports", 100)
        verbose = self.settings.get("verbose", False)

        enrichment_entry = self.request.entry
        relations = []

        for entry in entries:
            try:
                # Make API call
                headers = {"Key": api_key, "Accept": "application/json"}
                params = {
                    "ipAddress": entry.name,
                    "maxAgeInDays": max_age,
                    "verbose": verbose,
                }
                response = requests.get(self.API_URL, params=params, headers=headers)
                response.raise_for_status()

                result = response.json()

                # Process result
                reports = result.get("data", {}).get("reports", [])
                categories_found = self._process_reports(reports)

                # Store as relation
                relation = Relation(
                    e1=entry,
                    e2=enrichment_entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    inherit_av=True,
                    details={
                        "abuse_confidence_score": result.get("data", {}).get("abuseConfidenceScore", 0),
                        "total_reports": result.get("data", {}).get("totalReports", 0),
                        "is_whitelisted": result.get("data", {}).get("isWhitelisted", False),
                        "categories_found": categories_found,
                        "reports": reports[:max_reports],
                        "permalink": f"https://www.abuseipdb.com/check/{entry.name}",
                    },
                )
                relations.append(relation)

            except requests.RequestException as e:
                self.request._append_warning(f"AbuseIPDB API failed for {entry.name}: {str(e)}")

        # Bulk create relations
        if relations:
            Relation.objects.bulk_create(relations)

    def _process_reports(self, reports: list) -> dict:
        """Process reports to extract category counts."""
        mapping = self._get_mapping()
        categories_found = {}

        for report in reports:
            # Add human-readable categories to report
            report["categories_human_readable"] = []
            for category in report.get("categories", []):
                category_name = mapping.get(category, "unknown category")
                report["categories_human_readable"].append(category_name)

                # Count categories
                if category_name not in categories_found:
                    categories_found[category_name] = 1
                else:
                    categories_found[category_name] += 1

        return categories_found

    @staticmethod
    def _get_mapping() -> dict:
        """Get mapping of category IDs to human-readable names."""
        return {
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

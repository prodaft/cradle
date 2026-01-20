# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl

from typing import Optional

import requests
from django.db import models

from entries.enums import RelationReason
from entries.models import Entry, Relation

from ..base import BaseEnricher


class VirusTotalEnricher(BaseEnricher):
    """
    Enriches file hashes with VirusTotal scan results.

    Queries the VirusTotal API to retrieve malware detection information
    for file hashes (MD5, SHA1, SHA256).

    Supported entry classes:
    - hash (MD5, SHA1, SHA256)

    API Documentation: https://developers.virustotal.com/reference
    Rate Limit: 4 requests/minute (free tier)

    Relation details schema:
    {
        "hash_type": "sha256" | "md5" | "sha1",  # Hash algorithm
        "detections": int,                        # Number of AV engines detecting malware
        "total_engines": int,                     # Total engines that scanned
        "scan_date": str,                         # ISO 8601 timestamp
        "positives": [                            # List of detections
            {
                "engine": str,
                "result": str
            }
        ],
        "permalink": str                          # VirusTotal report URL
    }
    """

    display_name = "VirusTotal"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="VirusTotal API key (get from https://www.virustotal.com/gui/my-apikey)",
        ),
        "timeout": models.IntegerField(default=30, help_text="API request timeout in seconds"),
        "min_detections": models.IntegerField(
            default=1,
            help_text="Minimum detections to create relation (0 = always create)",
        ),
    }

    VT_API_URL = "https://www.virustotal.com/vtapi/v2/file/report"

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before starting."""
        # Check API key
        api_key = self.settings.get("api_key")
        if not api_key:
            return "VirusTotal API key is required"

        # Test API connectivity
        if not self._test_api_connection(api_key):
            return "Cannot connect to VirusTotal API. Check API key and network."

        # Validate entries
        if not entries:
            return "No entries provided for enrichment"

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Perform VirusTotal enrichment."""
        api_key = self.settings["api_key"]
        timeout = self.settings.get("timeout", 30)
        min_detections = self.settings.get("min_detections", 1)

        # Get enrichment entry for non-relational results
        enrichment_entry = self.request.entry

        relations_to_create = []

        for entry in entries:
            try:
                # Determine hash type
                hash_type = self._detect_hash_type(entry.name)
                if not hash_type:
                    self.request._append_warning(f"Could not determine hash type for {entry.name}")
                    continue

                # Query VirusTotal
                result = self._query_virustotal(entry.name, api_key, timeout)

                if result is None:
                    self.request._append_warning(f"No VirusTotal data found for {entry.name}")
                    continue

                # Check minimum detections threshold
                detections = result.get("positives", 0)
                if detections < min_detections:
                    continue

                # Build relation details
                details = {
                    "hash_type": hash_type,
                    "detections": detections,
                    "total_engines": result.get("total", 0),
                    "scan_date": result.get("scan_date", ""),
                    "positives": self._extract_positives(result),
                    "permalink": result.get("permalink", ""),
                }

                # Create relation to enrichment entry
                relation = Relation(
                    e1=entry,
                    e2=enrichment_entry,
                    inherit_av=True,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    details=details,
                )
                relations_to_create.append(relation)

            except requests.RequestException as e:
                self.request._append_warning(f"API request failed for {entry.name}: {str(e)}")
            except Exception as e:
                self.request._append_warning(f"Unexpected error enriching {entry.name}: {str(e)}")

        # Bulk create all relations
        if relations_to_create:
            Relation.objects.bulk_create(relations_to_create)

    def _test_api_connection(self, api_key: str) -> bool:
        """Test VirusTotal API connectivity."""
        try:
            response = requests.get(
                self.VT_API_URL,
                params={
                    "apikey": api_key,
                    "resource": "0" * 64,  # Dummy hash
                },
                timeout=5,
            )
            return response.status_code in [200, 404]  # 404 = valid API, hash not found
        except requests.RequestException:
            return False

    def _query_virustotal(self, file_hash: str, api_key: str, timeout: int):
        """Query VirusTotal for file hash."""
        response = requests.get(
            self.VT_API_URL,
            params={"apikey": api_key, "resource": file_hash},
            timeout=timeout,
        )
        response.raise_for_status()

        data = response.json()
        if data.get("response_code") != 1:
            return None

        return data

    def _detect_hash_type(self, hash_string: str) -> Optional[str]:
        """Detect hash type from string length."""
        length = len(hash_string)
        if length == 32:
            return "md5"
        elif length == 40:
            return "sha1"
        elif length == 64:
            return "sha256"
        return None

    def _extract_positives(self, result: dict) -> list:
        """Extract positive detections from scan results."""
        positives = []
        scans = result.get("scans", {})

        for engine, scan_result in scans.items():
            if scan_result.get("detected"):
                positives.append({"engine": engine, "result": scan_result.get("result", "")})

        return positives[:10]  # Limit to top 10 to reduce data size

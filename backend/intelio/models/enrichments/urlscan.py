# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl
import logging
import time
from typing import Optional
from django.db import models
from entries.models import Entry, Relation
from entries.enums import RelationReason
from ..base import BaseEnricher
from ..mappings.urlscan import URLScanMapping
import requests

logger = logging.getLogger(__name__)


class URLScanEnricher(BaseEnricher):
    """
    Enriches URLs and domains with URLScan.io data.

    URLScan.io is a service to scan and analyze websites. This enricher supports
    two modes: searching existing scans and submitting new scans with result polling.

    Supported entry classes:
    - url (URLs)
    - domain (Domain names)

    API Documentation: https://urlscan.io/docs/api/
    Rate Limit: Varies by plan (free tier: 100 searches/day, limited submissions)

    Relation details schema:
    For search mode:
    {
        "results": [              # Array of matching scans
            {
                "task": {
                    "uuid": str,
                    "url": str,
                    "time": str
                },
                "page": {
                    "url": str,
                    "domain": str,
                    "country": str,
                    "ip": str
                },
                "stats": {
                    "malicious": int,
                    "suspicious": int
                }
            }
        ],
        "total": int              # Total number of results
    }

    For submit_result mode:
    {
        "uuid": str,              # Scan UUID
        "result": str,            # Result URL
        "api": str,               # API endpoint
        "visibility": str,        # Scan visibility
        "page": {                 # Page information
            "url": str,
            "domain": str,
            "ip": str,
            "country": str,
            "server": str
        },
        "stats": {                # Statistics
            "malicious": int,
            "suspicious": int,
            "uniqIPs": int
        },
        "verdicts": {             # Security verdicts
            "overall": {
                "score": int,
                "malicious": bool
            },
            "urlscan": {...},
            "engines": {...}
        }
    }
    """

    display_name = "URLScan"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            blank=True,
            help_text="URLScan.io API key (required for submit_result, optional for search)",
        ),
        "analysis_mode": models.CharField(
            max_length=20,
            default="search",
            choices=[
                ("search", "Search existing scans"),
                ("submit_result", "Submit URL and get results"),
            ],
            help_text="Analysis mode: 'search' queries existing scans, 'submit_result' submits new scans",
        ),
        "visibility": models.CharField(
            max_length=20,
            default="public",
            choices=[
                ("public", "Public"),
                ("unlisted", "Unlisted"),
                ("private", "Private"),
            ],
            help_text="Scan visibility (only for submit_result mode)",
        ),
        "search_size": models.IntegerField(
            default=10, help_text="Maximum number of search results to return"
        ),
        "timeout": models.IntegerField(
            default=30, help_text="API request timeout in seconds"
        ),
        "extract_artifacts": models.BooleanField(
            default=True,
            blank=True,
            help_text="Extract discovered IPs and domains as separate entries",
        ),
    }

    API_URL = "https://urlscan.io/api/v1"

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        analysis_mode = self.settings.get("analysis_mode", "search")

        # API key is required for submit_result mode
        if analysis_mode == "submit_result" and not self.settings.get("api_key"):
            return "API key is required for submit_result mode"

        if not entries:
            return "No entries provided for enrichment"

        # Warn if mappings are missing and artifact extraction is enabled
        if (
            self.settings.get("extract_artifacts", True)
            and not URLScanMapping.objects.exists()
        ):
            self.request._append_warning(
                "No URLScan type mappings configured. "
                "Artifact extraction will be disabled. "
                "Configure URLScanMapping in Django admin to enable artifact extraction."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich URLs/domains with URLScan.io data."""
        api_key = self.settings.get("api_key", "")
        analysis_mode = self.settings.get("analysis_mode", "search")
        timeout = self.settings.get("timeout", 30)
        extract_artifacts = self.settings.get("extract_artifacts", True)

        # Setup headers
        headers = {"Content-Type": "application/json", "User-Agent": "CRADLE/v1.x"}
        if api_key:
            headers["API-Key"] = api_key

        enrichment_entry = self.request.entry

        for entry in entries:
            try:
                if analysis_mode == "search":
                    result = self._urlscan_search(entry, headers, timeout)
                elif analysis_mode == "submit_result":
                    result = self._urlscan_submit_and_poll(entry, headers, timeout)
                else:
                    self.request._append_warning(
                        f"Unknown analysis mode: {analysis_mode}"
                    )
                    continue

                if result:
                    # Create main relation with full results
                    Relation.objects.create(
                        e1=entry,
                        e2=enrichment_entry,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        content_object=self.request,
                        access_vector=self.request.access_vector,
                        inherit_av=True,
                        details=result,
                    )

                    # Extract artifacts if enabled
                    if extract_artifacts:
                        self._extract_artifacts(entry, result)

            except requests.RequestException as e:
                self.request._append_warning(
                    f"URLScan API failed for {entry.name}: {str(e)}"
                )
            except Exception as e:
                self.request._append_warning(
                    f"Unexpected error enriching {entry.name}: {str(e)}"
                )

    def _urlscan_search(self, entry: Entry, headers: dict, timeout: int) -> dict:
        """Search for existing scans of the URL/domain."""
        search_size = self.settings.get("search_size", 10)

        # Map CRADLE entry class to URLScan query format
        if entry.entry_class.subtype == "url":
            query = f'page.url:"{entry.name}"'
        elif entry.entry_class.subtype == "domain":
            query = f'domain:"{entry.name}"'
        else:
            # Default fallback
            query = f'"{entry.name}"'

        params = {"q": query, "size": search_size}

        response = requests.get(
            f"{self.API_URL}/search/",
            params=params,
            headers=headers,
            timeout=timeout,
        )
        response.raise_for_status()

        return response.json()

    def _urlscan_submit_and_poll(
        self, entry: Entry, headers: dict, timeout: int
    ) -> dict:
        """Submit URL for scanning and poll for results."""
        visibility = self.settings.get("visibility", "public")

        # Submit scan
        data = {"url": entry.name, "visibility": visibility}
        response = requests.post(
            f"{self.API_URL}/scan/",
            json=data,
            headers=headers,
            timeout=timeout,
        )

        # Handle error descriptions
        if response.status_code == 400:
            error_description = response.json().get("description", "")
            raise requests.HTTPError(error_description)

        response.raise_for_status()
        api_url = response.json().get("api", "")

        if not api_url:
            return {}

        # Poll for results
        return self._poll_for_result(api_url, headers, timeout)

    def _poll_for_result(self, api_url: str, headers: dict, timeout: int) -> dict:
        """
        Poll URLScan API for scan results.

        URLScan recommends waiting 10 seconds before polling,
        then polling every 2 seconds with a max timeout.
        """
        max_tries = 10
        poll_distance = 2
        result = {}

        # Initial wait as recommended by URLScan
        time.sleep(10)

        for attempt in range(max_tries):
            if attempt > 0:
                time.sleep(poll_distance)

            try:
                resp = requests.get(api_url, headers=headers, timeout=timeout)

                # 404 means scan is still processing
                if resp.status_code == 404:
                    continue

                resp.raise_for_status()
                result = resp.json()
                break

            except requests.RequestException:
                # Continue polling on errors
                continue

        if not result:
            self.request._append_warning(f"URLScan polling timed out for {api_url}")

        return result

    def _extract_artifacts(self, entry: Entry, result: dict) -> None:
        """Extract discovered artifacts from URLScan results using URLScanMapping."""
        # Extract from search results
        if "results" in result:
            for scan in result.get("results", []):
                page = scan.get("page", {})
                self._create_artifact_relations(entry, page)

        # Extract from submit_result
        elif "page" in result:
            self._create_artifact_relations(entry, result["page"])

    def _create_artifact_relations(self, source_entry: Entry, page_data: dict) -> None:
        """Create relations for discovered artifacts using URLScanMapping."""
        # Get type mapping from URLScan observable types to CRADLE entry classes
        typemapping = URLScanMapping.get_typemapping_rev()

        # Mapping of URLScan page fields to observable types
        field_mapping = {
            "domain": "domain",
            "ip": "ip",
            "url": "url",
            "asn": "asn",
            "country": "country",
            "server": "server",
        }

        # Track unmapped types
        unmapped_types = []

        for field_name, observable_type in field_mapping.items():
            value = page_data.get(field_name)

            if not value or value == source_entry.name:
                continue

            # Get CRADLE entry class for this observable type
            target_class = typemapping.get(observable_type)

            if target_class:
                # Create entry for the discovered artifact
                artifact_entry, _ = Entry.objects.get_or_create(
                    entry_class=target_class, name=str(value)
                )

                # Create relation
                Relation.objects.create(
                    e1=source_entry,
                    e2=artifact_entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    inherit_av=True,
                    details={
                        "source": "urlscan_page_data",
                        "field": field_name,
                        "discovered_from": source_entry.name,
                    },
                )
            else:
                # Track unmapped type
                unmapped_types.append(observable_type)
                logger.debug(
                    f"Skipping URLScan observable type '{observable_type}' - no mapping configured"
                )

        # Warn if unmapped types were encountered
        if unmapped_types:
            self.request._append_warning(
                f"Skipped URLScan observable type(s) without mappings: {', '.join(unmapped_types)}. "
                f"Configure URLScanMapping in Django admin to extract these artifacts."
            )

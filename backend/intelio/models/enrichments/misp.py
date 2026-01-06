# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl
import datetime
from typing import Optional
from django.db import models
from entries.models import Entry, Relation
from entries.enums import RelationReason
from ..base import BaseEnricher
from ..mappings.misp import MISPMapping
import logging
import pymisp

logger = logging.getLogger(__name__)


class MISPEnricher(BaseEnricher):
    """
    Enriches observables with MISP (Malware Information Sharing Platform) data.

    MISP is an open-source threat intelligence platform for sharing, storing and
    correlating Indicators of Compromise (IoCs). This enricher queries MISP for
    matching attributes and events. Can optionally extract related artifacts from
    MISP events as separate entries.

    Supported entry classes:
    - ip (IPv4/IPv6 addresses)
    - domain (Domain names)
    - url (URLs)
    - hash (MD5, SHA1, SHA256)
    - email (Email addresses)

    API Documentation: https://www.misp-project.org/openapi/
    Requires: pymisp Python package

    Relation details schema:
    {
        "result_search": [         # Array of matching MISP objects
            {
                "Event": {
                    "id": str,
                    "info": str,
                    "date": str,
                    "threat_level_id": str,
                    "published": bool,
                    "Attribute": [...]
                }
            }
        ],
        "instance_url": str,       # MISP instance URL
        "total_results": int
    }
    """

    display_name = "MISP"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="MISP API key",
        ),
        "instance_url": models.URLField(
            help_text="MISP instance URL (e.g., https://misp.example.com)",
        ),
        "ssl_verify": models.BooleanField(
            default=True,
            help_text="Verify SSL certificates (set to False for self-signed certs)",
        ),
        "debug": models.BooleanField(
            default=False,
            help_text="Enable debug mode for PyMISP",
        ),
        "from_days": models.IntegerField(
            default=0,
            help_text="Search events from N days ago (0 = no time filter)",
        ),
        "limit": models.IntegerField(
            default=100,
            help_text="Maximum number of results to return",
        ),
        "enforce_warninglist": models.BooleanField(
            default=False,
            help_text="Enforce MISP warninglists to filter results",
        ),
        "filter_on_type": models.BooleanField(
            default=True,
            help_text="Filter results by observable type",
        ),
        "strict_search": models.BooleanField(
            default=True,
            help_text="Use exact match search (False = wildcard search)",
        ),
        "published": models.BooleanField(
            default=False,
            help_text="Only return published events",
        ),
        "metadata": models.BooleanField(
            default=False,
            help_text="Only return event metadata (no attributes)",
        ),
        "timeout": models.IntegerField(
            default=5,
            help_text="API request timeout in seconds",
        ),
        "extract_artifacts": models.BooleanField(
            default=False,
            help_text="Extract related IPs, domains, and hashes from MISP attributes",
        ),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        if not self.settings.get("api_key"):
            return "MISP API key is required"

        if not self.settings.get("instance_url"):
            return "MISP instance URL is required"

        if not entries:
            return "No entries provided for enrichment"

        # Warn if mappings are missing
        if not MISPMapping.objects.exists():
            self.request._append_warning(
                "No MISP type mappings configured. "
                "Type filtering and artifact extraction will be disabled. "
                "Configure MISPMapping in Django admin to enable these features."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich observables with MISP data."""
        api_key = self.settings["api_key"]
        instance_url = self.settings["instance_url"]
        ssl_verify = self.settings.get("ssl_verify", True)
        debug = self.settings.get("debug", False)
        timeout = self.settings.get("timeout", 5)
        extract_artifacts = self.settings.get("extract_artifacts", False)

        # Initialize MISP client
        try:
            misp_instance = pymisp.PyMISP(
                url=instance_url,
                key=api_key,
                ssl=ssl_verify,
                debug=debug,
                timeout=timeout,
            )
        except Exception as e:
            self.request._append_warning(f"Failed to initialize MISP client: {str(e)}")
            return

        enrichment_entry = self.request.entry

        for entry in entries:
            try:
                # Build search parameters
                params = self._build_search_params(entry)

                # Execute search
                result_search = misp_instance.search(**params)

                # Check for errors in response
                if isinstance(result_search, dict):
                    errors = result_search.get("errors", [])
                    if errors:
                        self.request._append_warning(
                            f"MISP search errors for {entry.name}: {errors}"
                        )
                        continue

                # Create relation with results
                result = {
                    "result_search": result_search,
                    "instance_url": instance_url,
                    "total_results": (
                        len(result_search) if isinstance(result_search, list) else 0
                    ),
                }

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
                if extract_artifacts and isinstance(result_search, list):
                    self._extract_artifacts_from_events(entry, result_search)

            except Exception as e:
                self.request._append_warning(
                    f"MISP query failed for {entry.name}: {str(e)}"
                )

    def _build_search_params(self, entry: Entry) -> dict:
        """Build MISP search parameters based on settings and entry."""
        params = {
            "limit": self.settings.get("limit", 100),
        }

        # Add optional parameters
        if self.settings.get("enforce_warninglist"):
            params["enforce_warninglist"] = True

        if self.settings.get("published"):
            params["published"] = True

        if self.settings.get("metadata"):
            params["metadata"] = True

        # Search mode: strict or wildcard
        if self.settings.get("strict_search", True):
            params["value"] = entry.name
        else:
            params["searchall"] = f"%{entry.name}%"

        # Time filter
        from_days = self.settings.get("from_days", 0)
        if from_days > 0:
            now = datetime.datetime.now()
            date_from = now - datetime.timedelta(days=from_days)
            params["date_from"] = date_from.strftime("%Y-%m-%d %H:%M:%S")

        # Type filtering - use mapping to get MISP attribute types for this CRADLE entry class
        if self.settings.get("filter_on_type", True):
            misp_types = MISPMapping.get_misp_types_for_entry_class(
                entry.entry_class.subtype
            )
            if misp_types:
                params["type_attribute"] = misp_types

        return params

    def _extract_artifacts_from_events(self, source_entry: Entry, events: list) -> None:
        """Extract artifacts from MISP events using MISPMapping."""
        # Get type mapping from MISP attribute types to CRADLE entry classes
        typemapping = MISPMapping.get_typemapping_rev()

        # Track unmapped types to warn once per type
        unmapped_types = set()

        for event in events:
            if not isinstance(event, dict):
                continue

            event_data = event.get("Event", {})
            attributes = event_data.get("Attribute", [])

            for attr in attributes:
                if not isinstance(attr, dict):
                    continue

                attr_type = attr.get("type", "")
                attr_value = attr.get("value", "")

                if not attr_value or attr_value == source_entry.name:
                    continue

                # Use mapping to get CRADLE entry class for this MISP attribute type
                target_class = typemapping.get(attr_type)

                if target_class:
                    # Create entry for the discovered artifact
                    artifact_entry, _ = Entry.objects.get_or_create(
                        entry_class=target_class, name=attr_value
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
                            "source": "misp_attribute",
                            "event_id": event_data.get("id", ""),
                            "event_info": event_data.get("info", ""),
                            "attribute_type": attr_type,
                            "attribute_category": attr.get("category", ""),
                        },
                    )
                elif attr_type and attr_type not in unmapped_types:
                    # Log once per unmapped type
                    unmapped_types.add(attr_type)
                    logger.debug(
                        f"Skipping MISP attribute type '{attr_type}' - no mapping configured"
                    )

        # Warn user if unmapped types were encountered
        if unmapped_types:
            self.request._append_warning(
                f"Skipped {len(unmapped_types)} MISP attribute type(s) without mappings: "
                f"{', '.join(sorted(unmapped_types))}. "
                f"Configure MISPMapping in Django admin to extract these artifacts."
            )

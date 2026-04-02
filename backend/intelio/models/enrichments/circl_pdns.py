# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl

import logging
from typing import Optional
from urllib.parse import urlparse

import pypdns
from django.db import models

from entries.enums import RelationReason
from entries.models import Entry, Relation

from ...constants import (
    INTELIO_ENRICHMENT_MESSAGE_INIT_FAILED,
    INTELIO_ENRICHMENT_MESSAGE_REQUEST_FAILED,
)
from ..base import BaseEnricher
from ..mappings.dns import DNSMapping

logger = logging.getLogger(__name__)


class CIRCLPDNSEnricher(BaseEnricher):
    """Enriches domains with passive DNS data from CIRCL.

    Queries the CIRCL Passive DNS service to retrieve historical DNS records
    for domains and URLs. Creates relations to discovered IP addresses.

    Supported entry classes:
    - domain
    - url (extracts hostname)

    API Documentation: https://www.circl.lu/services/passive-dns/
    Credentials required: Contact CIRCL for access

    Relation details schema:
    {
        "record_type": str,        # DNS record type (A, AAAA, etc.)
        "time_first": str,         # First seen timestamp
        "time_last": str,          # Last seen timestamp
        "count": int,              # Number of times seen (if available)
    }
    """

    display_name = "CIRCL PDNS"

    settings_fields = {
        "username": models.CharField(max_length=255, help_text="CIRCL PDNS username"),
        "password": models.CharField(max_length=255, help_text="CIRCL PDNS password"),
        "timeout": models.IntegerField(default=5, help_text="Query timeout in seconds"),
    }

    PDNS_URL = "https://www.circl.lu/pdns/query"

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        if not self.settings.get("username"):
            return "Add your CIRCL PDNS username before running this enrichment."

        if not self.settings.get("password"):
            return "Add your CIRCL PDNS password before running this enrichment."

        if not entries:
            return "Select at least one entry to enrich."

        # Warn if mappings are missing
        if not DNSMapping.objects.exists():
            self.request._append_warning(
                "No DNS type mappings are configured. "
                "IP address extraction will be disabled until an administrator adds them in the admin site."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich domains with CIRCL passive DNS data."""
        username = self.settings["username"]
        password = self.settings["password"]
        timeout = self.settings.get("timeout", 5)

        # Initialize PDNS client
        try:
            pdns = pypdns.PyPDNS(url=self.PDNS_URL, basic_auth=(username, password))
        except Exception:
            logger.warning("Failed to initialize CIRCL PDNS client", exc_info=True)
            self.request._append_warning(INTELIO_ENRICHMENT_MESSAGE_INIT_FAILED)
            return

        # Get DNS type mapping
        typemapping = DNSMapping.get_typemapping_rev()

        # Track unmapped record types
        unmapped_types = set()

        for entry in entries:
            try:
                # Extract domain from entry
                domain = self._extract_domain(entry)
                if not domain:
                    self.request._append_warning("Could not extract a domain from this entry.")
                    continue

                # Query PDNS
                results = pdns.query(domain, timeout=timeout)

                # Process results
                for record in results:
                    # Get record type
                    record_type = record.get("rrtype", "")
                    if not record_type:
                        continue

                    # Use mapping to get CRADLE entry class for this DNS record type
                    target_class = typemapping.get(record_type)

                    if target_class:
                        # Get IP/hostname from record
                        rdata = record.get("rdata")
                        if not rdata:
                            continue

                        # Create entry for the discovered artifact
                        artifact_entry, _ = Entry.objects.get_or_create(entry_class=target_class, name=rdata)

                        # Create relation
                        Relation.objects.create(
                            e1=entry,
                            e2=artifact_entry,
                            reason=RelationReason.ENRICHMENT,
                            reason_context=self.name,
                            content_object=self.request,
                            access_vector=self.request.access_vector,
                            inherit_av=True,
                            details={
                                "record_type": record_type,
                                "time_first": self._format_timestamp(record.get("time_first")),
                                "time_last": self._format_timestamp(record.get("time_last")),
                                "count": record.get("count", 0),
                                "source": "circl_pdns",
                            },
                        )
                    elif record_type not in unmapped_types:
                        # Track unmapped type
                        unmapped_types.add(record_type)
                        logger.debug(f"Skipping DNS record type '{record_type}' - no mapping configured")

            except pypdns.errors.UnauthorizedError:
                self.request._append_warning("CIRCL PDNS authentication failed. Check credentials.")
                break  # Stop processing if auth fails
            except Exception:
                logger.warning("CIRCL PDNS lookup failed for entry %s", entry.pk, exc_info=True)
                self.request._append_warning(INTELIO_ENRICHMENT_MESSAGE_REQUEST_FAILED)

        # Warn if unmapped types were encountered
        if unmapped_types:
            self.request._append_warning(
                f"Some DNS record types were skipped because no mapping exists for them: "
                f"{', '.join(sorted(unmapped_types))}. "
                f"An administrator can add DNS type mappings in the admin site."
            )

    def _extract_domain(self, entry: Entry) -> Optional[str]:
        """Extract domain from entry based on entry class."""
        if entry.entry_class.subtype == "url":
            # Extract hostname from URL
            try:
                parsed = urlparse(entry.name)
                return parsed.hostname
            except Exception:
                return None
        elif entry.entry_class.subtype == "domain":
            return entry.name
        else:
            return entry.name

    def _format_timestamp(self, timestamp) -> str:
        """Format timestamp to string."""
        if timestamp is None:
            return ""

        # Handle datetime objects
        if hasattr(timestamp, "strftime"):
            return timestamp.strftime("%Y-%m-%d %H:%M:%S")

        # Return as-is if already a string
        return str(timestamp)

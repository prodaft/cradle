# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl

from typing import Optional
from urllib.parse import urlparse
from django.db import models
from entries.models import Entry, EntryClass, Relation
from entries.enums import RelationReason, EntryType
from ..base import BaseEnricher

try:
    import pypdns

    PYPDNS_AVAILABLE = True
except ImportError:
    PYPDNS_AVAILABLE = False


class CIRCLPDNSEnricher(BaseEnricher):
    """
    Enriches domains with passive DNS data from CIRCL.

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
        if not PYPDNS_AVAILABLE:
            return "pypdns library is not installed. Install with: pip install pypdns"

        if not self.settings.get("username"):
            return "CIRCL PDNS username is required"

        if not self.settings.get("password"):
            return "CIRCL PDNS password is required"

        if not entries:
            return "No entries provided for enrichment"

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich domains with CIRCL passive DNS data."""
        username = self.settings["username"]
        password = self.settings["password"]
        timeout = self.settings.get("timeout", 5)

        # Initialize PDNS client
        try:
            pdns = pypdns.PyPDNS(url=self.PDNS_URL, basic_auth=(username, password))
        except Exception as e:
            self.request._append_warning(f"Failed to initialize PDNS client: {e}")
            return

        # Get IP entry classes
        ipv4_class = EntryClass.objects.filter(
            type=EntryType.ARTIFACT, subtype="ip"
        ).first()
        ipv6_class = EntryClass.objects.filter(
            type=EntryType.ARTIFACT, subtype="ipv6"
        ).first()

        for entry in entries:
            try:
                # Extract domain from entry
                domain = self._extract_domain(entry)
                if not domain:
                    self.request._append_warning(
                        f"Could not extract domain from {entry.name}"
                    )
                    continue

                # Query PDNS
                results = pdns.query(domain, timeout=timeout)

                # Process results
                for record in results:
                    # Determine IP class based on record type
                    record_type = record.get("rrtype", "")

                    if record_type == "A" and ipv4_class:
                        ip_class = ipv4_class
                    elif record_type == "AAAA" and ipv6_class:
                        ip_class = ipv6_class
                    else:
                        continue  # Skip non-IP records

                    # Get or create IP entry
                    ip_address = record.get("rdata")
                    if not ip_address:
                        continue

                    ip_entry, _ = Entry.objects.get_or_create(
                        entry_class=ip_class, name=ip_address
                    )

                    # Create relation
                    Relation.objects.create(
                        e1=entry,
                        e2=ip_entry,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        content_object=self.request,
                        access_vector=self.request.access_vector,
                        inherit_av=True,
                        details={
                            "record_type": record_type,
                            "time_first": self._format_timestamp(
                                record.get("time_first")
                            ),
                            "time_last": self._format_timestamp(
                                record.get("time_last")
                            ),
                            "count": record.get("count", 0),
                        },
                    )

            except pypdns.errors.UnauthorizedError:
                self.request._append_warning(
                    "CIRCL PDNS authentication failed. Check credentials."
                )
                break  # Stop processing if auth fails
            except Exception as e:
                self.request._append_warning(
                    f"PDNS lookup failed for {entry.name}: {str(e)}"
                )

    def _extract_domain(self, entry: Entry) -> Optional[str]:
        """Extract domain from entry based on entry class."""
        if entry.entry_class.subtype == "url":
            # Extract hostname from URL
            try:
                parsed = urlparse(entry.name)
                return parsed.hostname
            except:
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

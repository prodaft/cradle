from typing import Optional
import logging

import dns.resolver
from django.db import models

from entries.enums import RelationReason
from entries.models import Entry, Relation

from ..base import BaseEnricher
from ..mappings.dns import DNSMapping

logger = logging.getLogger(__name__)


class DNSEnricher(BaseEnricher):
    display_name = "DNS"
    settings_fields = {
        "dns_server": models.CharField(
            default="1.1.1.1",
            help_text="DNS server to use for resolution (default: Cloudflare 1.1.1.1)",
        ),
        "resolve_ipv4": models.BooleanField(
            default=True,
            help_text="Resolve A records (IPv4 addresses)",
        ),
        "resolve_ipv6": models.BooleanField(
            default=True,
            help_text="Resolve AAAA records (IPv6 addresses)",
        ),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        # Warn if mappings are missing
        if not DNSMapping.objects.exists():
            self.request._append_warning(
                "No DNS type mappings configured. "
                "IP address extraction will be disabled. "
                "Configure DNSMapping in Django admin to enable IP extraction."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        dns_server = self.settings["dns_server"]
        resolve_ipv4 = self.settings.get("resolve_ipv4", True)
        resolve_ipv6 = self.settings.get("resolve_ipv6", True)

        # Get DNS type mapping
        typemapping = DNSMapping.get_typemapping_rev()

        # Get entry classes for A and AAAA records
        ipv4_class = typemapping.get("A")
        ipv6_class = typemapping.get("AAAA")

        # Track unmapped record types
        unmapped_types = set()

        # Setup DNS resolver
        resolver = dns.resolver.Resolver()
        resolver.nameservers = [dns_server]

        rels = []
        av = self.request.access_vector

        for entry in entries:
            hostname = entry.name

            # Resolve A records (IPv4)
            if resolve_ipv4:
                if ipv4_class:
                    try:
                        answers = resolver.resolve(hostname, "A")
                        for answer in answers:
                            ip_entry, _ = Entry.objects.get_or_create(entry_class=ipv4_class, name=answer.to_text())
                            rels.append(
                                Relation(
                                    e1=entry,
                                    e2=ip_entry,
                                    inherit_av=True,
                                    content_object=self.request,
                                    access_vector=av,
                                    reason=RelationReason.ENRICHMENT,
                                    reason_context=self.name,
                                    details={
                                        "record_type": "A",
                                        "ip": ip_entry.name,
                                        "domain": hostname,
                                    },
                                )
                            )
                    except dns.resolver.NXDOMAIN:
                        logger.debug(f"Domain not found: {hostname}")
                    except dns.resolver.NoAnswer:
                        logger.debug(f"No A record for {hostname}")
                    except Exception as e:
                        self.request._append_warning(f"DNS A record lookup failed for {hostname}: {str(e)}")
                elif "A" not in unmapped_types:
                    unmapped_types.add("A")
                    logger.debug("Skipping DNS A records - no mapping configured")

            # Resolve AAAA records (IPv6)
            if resolve_ipv6:
                if ipv6_class:
                    try:
                        answers = resolver.resolve(hostname, "AAAA")
                        for answer in answers:
                            ip_entry, _ = Entry.objects.get_or_create(entry_class=ipv6_class, name=answer.to_text())
                            rels.append(
                                Relation(
                                    e1=entry,
                                    e2=ip_entry,
                                    inherit_av=True,
                                    content_object=self.request,
                                    access_vector=av,
                                    reason=RelationReason.ENRICHMENT,
                                    reason_context=self.name,
                                    details={
                                        "record_type": "AAAA",
                                        "ip": ip_entry.name,
                                        "domain": hostname,
                                    },
                                )
                            )
                    except dns.resolver.NXDOMAIN:
                        logger.debug(f"Domain not found: {hostname}")
                    except dns.resolver.NoAnswer:
                        logger.debug(f"No AAAA record for {hostname}")
                    except Exception as e:
                        self.request._append_warning(f"DNS AAAA record lookup failed for {hostname}: {str(e)}")
                elif "AAAA" not in unmapped_types:
                    unmapped_types.add("AAAA")
                    logger.debug("Skipping DNS AAAA records - no mapping configured")

        # Bulk create all relations
        if rels:
            Relation.objects.bulk_create(rels)

        # Warn if unmapped types were encountered
        if unmapped_types:
            self.request._append_warning(
                f"Skipped DNS record type(s) without mappings: {', '.join(sorted(unmapped_types))}. "
                f"Configure DNSMapping in Django admin to extract these records."
            )

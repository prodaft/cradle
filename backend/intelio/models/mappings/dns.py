from django.db import models
from collections import defaultdict
from ..base import ClassMapping


class DNSMapping(ClassMapping):
    """
    Maps DNS record types to CRADLE entry classes.

    DNS resolution and passive DNS queries return various record types.
    This mapping allows CRADLE to automatically convert DNS records
    into the appropriate CRADLE entry classes.

    Used by:
    - DNSEnricher: Active DNS resolution
    - CIRCLPDNSEnricher: Passive DNS queries
    """

    display_name = "dns"

    # DNS record type choices
    # Based on: https://en.wikipedia.org/wiki/List_of_DNS_record_types
    RECORD_TYPE_CHOICES = [
        # Address records
        ("A", "IPv4 Address"),
        ("AAAA", "IPv6 Address"),
        # Name records
        ("CNAME", "Canonical Name"),
        ("PTR", "Pointer (Reverse DNS)"),
        # Mail records
        ("MX", "Mail Exchange"),
        # Service records
        ("SRV", "Service Locator"),
        ("NS", "Name Server"),
        # Text records
        ("TXT", "Text"),
        ("SPF", "Sender Policy Framework"),
        ("DKIM", "DomainKeys Identified Mail"),
        ("DMARC", "Domain-based Message Authentication"),
        # Security records
        ("DNSSEC", "DNS Security Extensions"),
        ("TLSA", "TLS Authentication"),
        # Other common records
        ("SOA", "Start of Authority"),
        ("CAA", "Certification Authority Authorization"),
        ("NAPTR", "Name Authority Pointer"),
    ]

    record_type = models.CharField(
        max_length=255,
        unique=True,
        choices=RECORD_TYPE_CHOICES,
        help_text="DNS record type",
    )

    @classmethod
    def get_typemapping_rev(cls):
        """
        Returns a dictionary mapping DNS record types to EntryClass objects.

        Returns:
            dict: {record_type: EntryClass}
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.record_type] = mapping.internal_class

        return typemapping

    def __str__(self):
        return f"DNS {self.record_type} -> {self.internal_class.subtype}"

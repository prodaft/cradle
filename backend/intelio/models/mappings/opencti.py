from collections import defaultdict

from django.db import models

from ..base import ClassMapping


class OpenCTIMapping(ClassMapping):
    """Maps OpenCTI STIX Cyber Observable types to CRADLE entry classes.

    OpenCTI uses STIX 2.1 Cyber Observable Objects (SCOs) to represent indicators.
    This mapping allows CRADLE to automatically convert OpenCTI observables
    into the appropriate CRADLE entry classes.
    """

    display_name = "opencti"

    # OpenCTI STIX Cyber Observable type choices
    # Based on: https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html
    OBSERVABLE_TYPE_CHOICES = [
        # Network observables
        ("IPv4-Addr", "IPv4 Address"),
        ("IPv6-Addr", "IPv6 Address"),
        ("Domain-Name", "Domain Name"),
        ("URL", "URL"),
        ("Email-Addr", "Email Address"),
        ("Mac-Addr", "MAC Address"),
        ("Network-Traffic", "Network Traffic"),
        ("Autonomous-System", "Autonomous System"),
        # File observables
        ("File", "File"),
        ("Artifact", "Artifact"),
        ("Directory", "Directory"),
        # Hash observables (used within File objects)
        ("StixFile:hashes.MD5", "File MD5 Hash"),
        ("StixFile:hashes.SHA-1", "File SHA-1 Hash"),
        ("StixFile:hashes.SHA-256", "File SHA-256 Hash"),
        ("StixFile:hashes.SHA-512", "File SHA-512 Hash"),
        # Software observables
        ("Software", "Software"),
        # User observables
        ("User-Account", "User Account"),
        # Process observables
        ("Process", "Process"),
        # Windows specific
        ("Windows-Registry-Key", "Windows Registry Key"),
        # Other
        ("Mutex", "Mutex"),
        ("X509-Certificate", "X.509 Certificate"),
        ("Cryptocurrency-Wallet", "Cryptocurrency Wallet"),
        ("Text", "Text"),
        ("Hostname", "Hostname"),
        ("User-Agent", "User Agent"),
    ]

    observable_type = models.CharField(
        max_length=255,
        unique=True,
        choices=OBSERVABLE_TYPE_CHOICES,
        help_text="OpenCTI STIX Cyber Observable type",
    )

    @classmethod
    def get_typemapping_rev(cls):
        """Returns a dictionary mapping OpenCTI observable types to EntryClass objects.

        Returns:
            dict: Mapping of observable_type to EntryClass.
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.observable_type] = mapping.internal_class

        return typemapping

    def __str__(self):
        return f"OpenCTI {self.observable_type} -> {self.internal_class.subtype}"

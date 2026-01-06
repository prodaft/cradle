from django.db import models
from collections import defaultdict
from ..base import ClassMapping


class MISPMapping(ClassMapping):
    """
    Maps MISP attribute types to CRADLE entry classes.

    MISP uses various attribute types to categorize indicators.
    This mapping allows CRADLE to automatically convert MISP attributes
    into the appropriate CRADLE entry classes.
    """

    display_name = "misp"

    # MISP attribute type choices
    # Based on: https://www.misp-project.org/datamodels/
    ATTRIBUTE_TYPE_CHOICES = [
        # Network indicators
        ("ip-dst", "IP Destination"),
        ("ip-src", "IP Source"),
        ("ip-dst|port", "IP Destination with Port"),
        ("ip-src|port", "IP Source with Port"),
        ("domain", "Domain"),
        ("domain|ip", "Domain with IP"),
        ("hostname", "Hostname"),
        ("url", "URL"),
        ("uri", "URI"),
        ("user-agent", "User Agent"),
        # Hash values
        ("md5", "MD5 Hash"),
        ("sha1", "SHA1 Hash"),
        ("sha256", "SHA256 Hash"),
        ("sha512", "SHA512 Hash"),
        ("ssdeep", "SSDEEP Hash"),
        ("imphash", "Import Hash"),
        ("authentihash", "Authentihash"),
        # Email indicators
        ("email", "Email Address"),
        ("email-src", "Email Source"),
        ("email-dst", "Email Destination"),
        ("email-subject", "Email Subject"),
        ("email-attachment", "Email Attachment"),
        # File indicators
        ("filename", "Filename"),
        ("filename|md5", "Filename with MD5"),
        ("filename|sha1", "Filename with SHA1"),
        ("filename|sha256", "Filename with SHA256"),
        # Other
        ("mutex", "Mutex"),
        ("vulnerability", "Vulnerability (CVE)"),
        ("AS", "Autonomous System Number"),
        ("malware-sample", "Malware Sample"),
        ("link", "Link"),
        ("comment", "Comment"),
        ("text", "Text"),
        ("other", "Other"),
    ]

    attribute_type = models.CharField(
        max_length=255,
        unique=True,
        choices=ATTRIBUTE_TYPE_CHOICES,
        help_text="MISP attribute type",
    )

    @classmethod
    def get_typemapping_rev(cls):
        """
        Returns a dictionary mapping MISP attribute types to EntryClass objects.

        Returns:
            dict: {attribute_type: EntryClass}
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.attribute_type] = mapping.internal_class

        return typemapping

    @classmethod
    def get_misp_types_for_entry_class(cls, entry_class_subtype: str):
        """
        Returns a list of MISP attribute types that map to a given CRADLE entry class subtype.

        This is used when querying MISP to filter by attribute type.

        Args:
            entry_class_subtype: CRADLE entry class subtype (e.g., "ip", "domain")

        Returns:
            list: List of MISP attribute types
        """
        misp_types = []

        for mapping in cls.objects.all():
            if mapping.internal_class.subtype == entry_class_subtype:
                misp_types.append(mapping.attribute_type)

        return misp_types

    def __str__(self):
        return f"MISP {self.attribute_type} -> {self.internal_class.subtype}"

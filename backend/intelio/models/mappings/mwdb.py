from collections import defaultdict

from django.db import models

from ..base import ClassMapping


class MWDBMapping(ClassMapping):
    """Maps MWDB artifact types to CRADLE entry classes.

    MWDB stores various artifact types including files, configs, and blobs.
    This mapping allows CRADLE to automatically convert MWDB artifacts
    into the appropriate CRADLE entry classes.
    """

    display_name = "mwdb"

    # MWDB artifact type choices
    # Based on: https://mwdb.readthedocs.io/en/latest/
    ARTIFACT_TYPE_CHOICES = [
        # File types
        ("file", "File"),
        ("config", "Configuration"),
        ("blob", "Binary Blob"),
        ("text_blob", "Text Blob"),
        # Hash types (for hash-specific mappings)
        ("md5", "MD5 Hash"),
        ("sha1", "SHA1 Hash"),
        ("sha256", "SHA256 Hash"),
        ("sha512", "SHA512 Hash"),
        ("crc32", "CRC32 Checksum"),
        ("ssdeep", "SSDEEP Hash"),
        # Relationship types
        ("parent", "Parent Artifact"),
        ("child", "Child Artifact"),
    ]

    artifact_type = models.CharField(
        max_length=255,
        unique=True,
        choices=ARTIFACT_TYPE_CHOICES,
        help_text="MWDB artifact type",
    )

    @classmethod
    def get_typemapping_rev(cls):
        """Returns a dictionary mapping MWDB artifact types to EntryClass objects.

        Returns:
            dict: Mapping of artifact_type to EntryClass.
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.artifact_type] = mapping.internal_class

        return typemapping

    def __str__(self):
        return f"MWDB {self.artifact_type} -> {self.internal_class.subtype}"

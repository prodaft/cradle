from django.db import models
from collections import defaultdict
from ..base import ClassMapping


class URLScanMapping(ClassMapping):
    """
    Maps URLScan observable types to CRADLE entry classes.

    URLScan returns various observable types in their scan results.
    This mapping allows CRADLE to automatically convert URLScan observables
    into the appropriate CRADLE entry classes.
    """

    display_name = "urlscan"

    # URLScan observable type choices
    # Based on URLScan.io API response structure
    OBSERVABLE_TYPE_CHOICES = [
        ("domain", "Domain"),
        ("ip", "IP Address"),
        ("url", "URL"),
        ("asn", "Autonomous System Number"),
        ("country", "Country Code"),
        ("server", "Server Software"),
        ("hash", "File Hash"),
    ]

    observable_type = models.CharField(
        max_length=255,
        unique=True,
        choices=OBSERVABLE_TYPE_CHOICES,
        help_text="URLScan observable type",
    )

    @classmethod
    def get_typemapping_rev(cls):
        """
        Returns a dictionary mapping URLScan observable types to EntryClass objects.

        Returns:
            dict: {observable_type: EntryClass}
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.observable_type] = mapping.internal_class

        return typemapping

    def __str__(self):
        return f"URLScan {self.observable_type} -> {self.internal_class.subtype}"

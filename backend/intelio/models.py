from django.db import models
from django.contrib.postgres.fields import JSONField
from core.fields import BitStringField
from entries.models import EntryClass


class Association(models.Model):
    """
    A model representing a generic link between two entries.
    """

    reason = models.CharField(max_length=255)
    details = JSONField(default=dict, blank=True)
    access_vector: BitStringField = BitStringField(
        max_length=2048, null=False, default=1 << 2047, varying=False
    )
    entry1 = models.ForeignKey(
        "Entry", on_delete=models.CASCADE, related_name="associations_as_entry1"
    )
    entry2 = models.ForeignKey(
        "Entry", on_delete=models.CASCADE, related_name="associations_as_entry2"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Association [{self.reason}]({self.entry1}-{self.entry2}) "


class Encounter(models.Model):
    """
    A model representing an observation of an entry from an outside source.
    """

    from_source = models.CharField(
        max_length=255, db_column="from"
    )  # Avoid conflicts with SQL reserved keyword
    created_at = models.DateTimeField(auto_now_add=True)
    entry = models.ForeignKey(
        "Entry", on_delete=models.CASCADE, related_name="encounters"
    )
    details = JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Encounter[{self.from_source}]({self.entry})"


class ClassMapping(models.Model):
    """
    Abstract model representing a mapping from an internal entry class
    to an external type.

    Subclasses should implement the actual key-value pairs.
    """

    internal_class = models.ForeignKey(
        EntryClass, related_name="%(class)ss", on_delete=models.CASCADE
    )

    class Meta:
        abstract = True


class CatalystMapping(ClassMapping):
    """
    A mapping for Catalyst types.
    """

    level = models.CharField(max_length=255)
    name = models.CharField(max_length=255)

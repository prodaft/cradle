from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import ValidationError
from django.db import models
from core.fields import BitStringField
from entries.models import EntryClass, Entry
from notes.models import Relation

from django_lifecycle import AFTER_CREATE, AFTER_UPDATE, LifecycleModel, hook

from django.utils.translation import gettext_lazy as _

from django import forms


class EnrichmentStrategy(models.TextChoices):
    MANUAL = "manual", _("Manual")
    ON_CREATE = "on_create", _("On Create")


#    PERIODIC = "periodic", _("Periodic")


class Association(LifecycleModel):
    """
    A model representing a generic link between two entries.
    """

    reason = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)
    access_vector: BitStringField = BitStringField(
        max_length=2048, null=False, default=1 << 2047, varying=False
    )
    entry1 = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="associations_as_entry1"
    )
    entry2 = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="associations_as_entry2"
    )

    relation = GenericRelation(Relation, related_query_name="association")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Association [{self.reason}]({self.entry1}-{self.entry2}) "

    @hook(AFTER_CREATE)
    def create_relation(self, *args, **kwargs):
        Relation.objects.create(
            src_entry=self.entry1,
            dst_entry=self.entry2,
            content_object=self,
            access_vector=self.access_vector,
        )

    @hook(AFTER_UPDATE, when="access_vector")
    def update_relation(self, *args, **kwargs):
        relation = self.relation.first()

        if relation:
            relation.save()


class Encounter(models.Model):
    """
    A model representing an observation of an entry from an outside source.
    """

    from_source = models.CharField(max_length=255, db_column="from")
    created_at = models.DateTimeField(auto_now_add=True)
    entry = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="encounters"
    )
    details = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Encounter[{self.from_source}]({self.entry})"


class BaseEnricher:
    display_name = None
    settings_fields = {}

    def __init__(self, settings: dict):
        self.settings = settings

    def enrich(self, entries: list[Entry]):
        raise NotImplementedError

    @classmethod
    def get_subclass(cls, name):
        for subclass in cls.__subclasses__():
            if subclass.__name__ == name:
                return subclass

        return None

    @classmethod
    def get_default_settings(cls):
        """
        Build a dictionary of default settings values based on the defined model fields.
        """
        defaults = {}
        for field_name, field in cls.settings_fields.items():
            defaults[field_name] = field.get_default() if field.has_default() else None
        return defaults

    @classmethod
    def validate_settings(cls, settings_data):
        """
        Validate the provided settings_data using the defined model fields.
        Returns a dictionary of errors (empty if valid).
        """
        errors = {}
        for field_name, field in cls.settings_fields.items():
            try:
                field.clean(settings_data.get(field_name), None)
            except Exception as e:
                errors[field_name] = str(e)
        return errors

    @classmethod
    def serialize_settings(cls, settings_data):
        return settings_data

    @classmethod
    def deserialize_settings(cls, json_data):
        return json_data


class EnricherSettings(models.Model):
    """
    A strategy for enriching an entry with additional information.
    """

    strategy = models.CharField(
        max_length=255,
        choices=EnrichmentStrategy.choices,
        default=EnrichmentStrategy.MANUAL,
    )
    periodicity = models.DurationField(null=True, blank=True)
    for_eclasses = models.ManyToManyField(
        EntryClass, related_name="enrichers", blank=True
    )

    enricher_type = models.CharField(max_length=255, unique=True)
    settings = models.JSONField(default=dict, blank=True)

    def __str__(self):
        config = self.get_type_config()
        display = config.display_name if config else self.enricher_type
        return f"{display} ({self.for_eclasses})"

    def clean(self):
        """
        Optional: validate that the settings match the expected fields for the enricher_type.
        """
        config = BaseEnricher.get_subclass(self.enricher_type)
        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")

        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")
        errors = config.validate_settings(self.settings)
        if errors:
            raise ValidationError(errors)


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

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        if cls._meta.abstract:
            return

        display_name = getattr(cls, "display_name", None)
        if not isinstance(display_name, str):
            raise TypeError(
                f"{cls.__name__} must define a class attribute 'name' as a string"
            )

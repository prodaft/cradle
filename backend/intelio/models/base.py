from typing import Any, Optional
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import ValidationError
from django.db import models, transaction
from core.fields import BitStringField
from entries.models import EntryClass, Entry
from entries.models import Relation
import os

from django_lifecycle import (
    AFTER_DELETE,
    LifecycleModel,
    hook,
)


from ..enums import EnrichmentStrategy, DigestStatus
import uuid

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


class BaseDigest(LifecycleModel):
    """
    An import of multiple external objects and connections, bulk "digested" into the platform
    """

    infer_entities = False

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)
    title: models.CharField = models.CharField(max_length=255, null=False, blank=False)
    user = models.ForeignKey(
        "user.CradleUser", on_delete=models.CASCADE, related_name="digests"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=255,
        choices=DigestStatus.choices,
        default=DigestStatus.WORKING,
    )
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)

    digest_type = models.CharField(max_length=255, null=False, blank=False)

    entities = models.ManyToManyField(
        Entry,
        related_name="digests",
    )

    relations = GenericRelation(Relation, related_query_name="digests")

    class Meta:
        ordering = ["-created_at"]

        # digest_type cannot be BaseDigest
        constraints = [
            models.CheckConstraint(
                check=~models.Q(digest_type="BaseDigest"),
                name="digest_type_not_base_digest",
            ),
        ]

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.digest_type = self.__class__.__name__

    @classmethod
    def from_db(cls, db, field_names, values):
        if cls.__name__ != "BaseDigest":
            return super().from_db(db, field_names, values)

        for i in range(len(field_names)):
            if field_names[i] == "digest_type":
                if cls.get_subclass(values[i]) is not None:
                    cls = cls.get_subclass(values[i])
                else:
                    return super().from_db(db, field_names, values)

        instance = cls.from_db(db, field_names, values)

        return instance

    @classmethod
    def get_subclass(cls, name):
        for subclass in cls.__subclasses__():
            if subclass.__name__ == name:
                return subclass

        return None

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        if cls._meta.abstract:
            return

        display_name = getattr(cls, "display_name", None)
        if not isinstance(display_name, str):
            raise TypeError(
                f"{cls.__name__} must define a class attribute 'name' as a string"
            )

    @property
    def path(self):
        upload_dir = os.path.join(settings.MEDIA_ROOT, "digests", str(self.user.id))
        os.makedirs(upload_dir, exist_ok=True)
        fpath = os.path.join(upload_dir, str(self.id))
        return fpath

    def digest(self):
        """
        Perform the actual digesting of the external data.
        """
        self.status = DigestStatus.WORKING
        self.save()

        try:
            if self._digest():
                self.status = DigestStatus.DONE
            else:
                self.status = DigestStatus.ERROR
        except Exception as e:
            self.status = DigestStatus.ERROR
            self.errors.append(
                "An unknown error has occured, please contact your administrator"
            )
            self.save()
            raise e

        self.save()

    def _digest(self):
        raise NotImplementedError

    @hook(AFTER_DELETE)
    def delete_file(self):
        self.id = self._initial_state.get_value(self, "id")

        if os.path.exists(self.path):
            os.remove(self.path)

    def _append_error(self, error):
        with transaction.atomic():
            self.errors = list(set(self.errors) | {error})
            self.save()

    def _append_warning(self, error):
        with transaction.atomic():
            self.warnings = list(set(self.warnings) | {error})
            self.save()

    def update_access_vector(self):
        from notes.utils import calculate_acvec

        access_vector = calculate_acvec(self.entities.all())
        self.relations.update(access_vector=access_vector)


class BaseEnricher:
    display_name = None
    settings_fields = {}

    def __init__(self, settings: dict):
        self.settings = settings

    def pre_enrich(self, entries: list[Entry], user) -> Optional[str]:
        raise NotImplementedError

    def enrich(self, entries: list[Entry], content_object, user) -> None:
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

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)

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

    enabled = models.BooleanField(default=False)

    def __str__(self):
        display = self.enricher_type
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

    @property
    def enricher(self):
        """
        Return the enricher class based on the enricher_type.
        """
        config = BaseEnricher.get_subclass(self.enricher_type)
        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")
        return config(settings=self.settings)


class ClassMapping(models.Model):
    """
    Abstract model representing a mapping from an internal entry class
    to an external type.

    Subclasses should implement the actual key-value pairs.
    """

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)

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

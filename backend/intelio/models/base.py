import os
import uuid
from collections import defaultdict
from datetime import timedelta
from typing import Any, Optional
from entries.enums import EntryType
from pydantic import BaseModel, ValidationError as PydanticValidationError

from core.fields import BitStringField
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django_lifecycle import (
    AFTER_CREATE,
    AFTER_DELETE,
    LifecycleModel,
    hook,
)
from entries.models import Entry, EntryClass, Relation
from user.models import CradleUser

from ..enums import DigestStatus, EnrichmentStatus

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

    relations = GenericRelation(Relation, related_query_name="digest")

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
        self.digest_type = (
            self.__class__.__name__ if not self.digest_type else self.digest_type
        )

    @property
    def entry(self) -> Entry:
        """
        Return the entry representing this digest.
        """
        entry_class, _ = EntryClass.objects.get_or_create(
            subtype="digest", type=EntryType.ARTIFACT
        )
        entry, _ = Entry.objects.create(
            name=f"{self.digest_type} Digest {self.title}", entry_class=entry_class
        )
        return entry

    @property
    def access_vector(self):
        from notes.utils import calculate_acvec

        return calculate_acvec(self.entities.all())

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
        try:
            if self._digest():
                self.status = DigestStatus.WORKING
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
        if error in self.errors:
            return
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions
            instance = BaseDigest.objects.select_for_update().get(pk=self.pk)
            if error not in instance.errors:
                instance.errors.append(error)
                instance.save(update_fields=["errors"])
            # Update the current instance to reflect the change
            self.errors = instance.errors

    def _append_warning(self, warning):
        if warning in self.warnings:
            return
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions
            instance = BaseDigest.objects.select_for_update().get(pk=self.pk)
            if warning not in instance.warnings:
                instance.warnings.append(warning)
                instance.save(update_fields=["warnings"])
            # Update the current instance to reflect the change
            self.warnings = instance.warnings

    def update_access_vector(self):
        from notes.utils import calculate_acvec

        access_vector = calculate_acvec(self.entities.all())
        self.relations.update(access_vector=access_vector)


class BaseEnricher:
    display_name = None
    settings_fields = {}

    def __init__(self, settings: dict, request: "EnrichmentRequest"):
        self.settings = settings
        self.request = request

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        raise NotImplementedError

    def enrich(self, entries: list[Entry]) -> None:
        raise NotImplementedError

    @property
    def name(self):
        return self.__class__.__name__

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
        config = BaseEnricher.get_subclass(self.enricher_type)
        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")

        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")
        errors = config.validate_settings(self.settings)
        if errors:
            raise ValidationError(errors)

    def enricher(self, request: "EnrichmentRequest"):
        """
        Return the enricher class based on the enricher_type.
        """
        config = BaseEnricher.get_subclass(self.enricher_type)
        if config is None:
            raise ValidationError(f"Unknown enricher type: {self.enricher_type}")
        return config(settings=self.settings, request=request)


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

    @classmethod
    def get_typemapping(cls):
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.internal_class] = mapping

        return typemapping


class EnrichmentRequestSchema(BaseModel):
    """
    Schema for enrichment requests.
    """

    entry_class: str
    name: str


class EnrichmentRequest(LifecycleModel):
    enrichers_settings = models.ManyToManyField(
        EnricherSettings,
    )

    title = models.CharField(max_length=255)
    automated = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=255,
        choices=EnrichmentStatus.choices,
        default=EnrichmentStatus.WAITING,
    )

    user = models.ForeignKey(
        CradleUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="enrichment_requests",
    )
    entities = models.ManyToManyField(
        Entry,
        related_name="enrichment_requests",
    )
    enricher_status = models.JSONField(default=dict, blank=True)

    relations = GenericRelation(Relation, related_query_name="enrichment")
    request = models.JSONField(default=list, blank=False)
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)

    def clean(self):
        if not self.enrichment_settings:
            raise ValidationError("At least one enricher must be selected")

        for enricher in self.enrichers_settings.all():
            config = BaseEnricher.get_subclass(enricher.enricher_type)
            if config is None:
                raise ValidationError(
                    f"Unknown enricher type: {enricher.enricher_type}"
                )

        if not isinstance(self.request, list):
            raise ValidationError({"request": "Must be a list"})

        classes = set()
        try:
            for req in self.request:
                classes.add(EnrichmentRequestSchema(**req).entry_class)
        except PydanticValidationError as e:
            raise ValidationError({"request": str(e)})

        if EntryClass.objects.filter(
            subtype__in=classes, type=EntryType.ARTIFACT
        ).count() != len(classes):
            invalid_classes = classes - set(
                EntryClass.objects.filter(
                    subtype__in=classes, type=EntryType.ARTIFACT
                ).values_list("subtype", flat=True)
            )
            raise ValidationError(
                {"request": f"Invalid entry classes: {invalid_classes}"}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def entry(self):
        """
        Return the entry representing this enrichment request.
        """
        entry_class, _ = EntryClass.objects.get_or_create(
            subtype="enrichment", type=EntryType.ARTIFACT
        )
        entry, _ = Entry.objects.get_or_create(
            name=f"Enrichment Request {self.title} [{self.id}]", entry_class=entry_class
        )
        return entry

    @property
    def enrichers(self):
        """
        Return the enricher class based on the enrichment_settings.
        """
        enrichers = []

        for enricher_settings in self.enrichers_settings.all():
            subclass = BaseEnricher.get_subclass(enricher_settings.enricher_type)

            if subclass is None:
                raise ValidationError(
                    f"Unknown enricher type: {enricher_settings.enricher_type}"
                )
            config = subclass(settings=enricher_settings.settings, request=self)
            enrichers.append(config)

        return enrichers

    def entries(self, classes: set[str] | None = None):
        entries = []
        entry_classes = {}

        for req in self.request:
            if classes is None or req["entry_class"] in classes:
                if req["entry_class"] not in entry_classes:
                    entry_classes[req["entry_class"]] = EntryClass.objects.get(
                        subtype=req["entry_class"], type=EntryType.ARTIFACT
                    )
                entry_class = entry_classes[req["entry_class"]]

                entry, _ = Entry.objects.get_or_create(
                    name=req["name"], entry_class=entry_class
                )
                entries.append(entry)

        return entries

    @hook(AFTER_CREATE)
    def start_enrichment(self):
        """
        Start the enrichment process after creation.
        """
        from ..tasks import start_enrich

        self.id = self._initial_state.get_value(self, "id")

        # Trigger the enrichment process
        # This could be handled by a background task or Celery
        self.status = EnrichmentStatus.WORKING
        self.save(update_fields=["status"])
        transaction.on_commit(lambda: start_enrich.apply_async(self.id))

    @property
    def access_vector(self):
        from notes.utils import calculate_acvec

        return calculate_acvec(self.entities.all())

    def update_access_vector(self):
        self.relations.update(access_vector=self.access_vector)

    def _set_enricher_status(self, enricher_type: str, status: EnrichmentStatus):
        if self.finished_enrichers and enricher_type in self.finished_enrichers:
            return
        with transaction.atomic():
            instance = EnrichmentRequest.objects.select_for_update().get(pk=self.pk)
            instance.finished_enrichers = instance.finished_enrichers or {}
            if enricher_type not in instance.finished_enrichers:
                instance.finished_enrichers[enricher_type] = status

                if (
                    len(instance.finished_enrichers)
                    == instance.enrichers_settings.count()
                ):
                    instance.completed_at = models.DateTimeField(auto_now=True)
                    err_count, succes_count = 0, 0
                    for stat in instance.finished_enrichers.values():
                        if stat == EnrichmentStatus.ERROR:
                            err_count += 1
                        else:
                            succes_count += 1

                    if err_count > 0 and succes_count == 0:
                        instance.status = EnrichmentStatus.ERROR
                    elif err_count > 0:
                        instance.status = EnrichmentStatus.WARNING
                    else:
                        instance.status = EnrichmentStatus.COMPLETED

                    instance.save(
                        update_fields=["finished_enrichers", "completed_at", "status"]
                    )
                else:
                    instance.save(update_fields=["finished_enrichers"])

    def _append_error(self, error):
        if error in self.errors:
            return
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions
            instance = BaseDigest.objects.select_for_update().get(pk=self.pk)
            if error not in instance.errors:
                instance.errors.append(error)
                instance.save(update_fields=["errors"])
            # Update the current instance to reflect the change
            self.errors = instance.errors

    def _append_warning(self, warning):
        if warning in self.warnings:
            return
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions
            instance = BaseDigest.objects.select_for_update().get(pk=self.pk)
            if warning not in instance.warnings:
                instance.warnings.append(warning)
                instance.save(update_fields=["warnings"])
            # Update the current instance to reflect the change
            self.warnings = instance.warnings

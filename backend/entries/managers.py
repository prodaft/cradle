"""Custom managers and querysets for Entry, Relation, and Edge models."""

from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import BooleanField, Case, Exists, OuterRef, Value, When
from django.db.models.expressions import RawSQL
from django.db.models.query_utils import Q

from core.fields import BitStringField
from cradle.settings_common import INTERNAL_SUBTYPES
from user.models import CradleUser

from .enums import EntryType, RelationReason

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


def _accessible_by_access_vector(queryset: models.QuerySet, user: CradleUser) -> models.QuerySet:
    """Filter queryset to rows where (access_vector & user.access_vector_inv) = 0."""
    return queryset.annotate(
        _av_check=RawSQL(
            "(access_vector & %s) = %s",
            [user.access_vector_inv, fieldtype.get_prep_value(0)],
        )
    ).filter(_av_check=True)


class EntryQuerySet(models.QuerySet):
    """QuerySet with entry-specific filters and access control."""

    def is_artifact(self) -> models.QuerySet:
        """Filter to artifact entries only."""
        return self.filter(entry_class__type=EntryType.ARTIFACT)

    def is_entity(self) -> models.QuerySet:
        """Filter to entity entries only."""
        return self.filter(entry_class__type=EntryType.ENTITY)

    def unreferenced(self) -> models.QuerySet:
        """Filter to entries with no relations."""
        return self.filter(Q(relations_1=None) & Q(relations_2=None))

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to entries accessible to the user (via edges or entity type)."""
        Edge = apps.get_model("entries", "Edge")
        accessible_vertices = Edge.objects.accessible(user).values_list("src", flat=True)
        return self.filter(Q(id__in=accessible_vertices) | Q(entry_class__type=EntryType.ENTITY))

    def non_virtual(self) -> models.QuerySet:
        """Exclude internal/virtual entry classes."""
        return self.exclude(entry_class__subtype__in=INTERNAL_SUBTYPES)


class RelationQuerySet(models.QuerySet):
    """QuerySet with access-vector filtering for relations."""

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to relations accessible to the user.

        Relations with reason NOTE must reference a note that passes ``Note``
        access rules (access-vector alone is insufficient for orphan notes).
        """
        qs = _accessible_by_access_vector(self, user)
        if user.is_cradle_admin:
            return qs

        Note = apps.get_model("notes", "Note")
        note_ct_id = ContentType.objects.get_for_model(Note).id
        accessible_note = Note.objects.accessible(user).filter(pk=OuterRef("object_id"))
        return qs.annotate(
            _note_accessible=Case(
                When(~Q(reason=RelationReason.NOTE), then=Value(True)),
                When(~Q(content_type_id=note_ct_id), then=Value(True)),
                default=Exists(accessible_note),
                output_field=BooleanField(),
            ),
        ).filter(_note_accessible=True)


class EdgeQuerySet(models.QuerySet):
    """QuerySet with access-vector filtering for edges."""

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to edges accessible to the user."""
        return _accessible_by_access_vector(self, user)


class EntryManager(models.Manager):
    """Manager for Entry with access control and type-specific filters."""

    def get_queryset(self):
        """Return EntryQuerySet for entry-specific filters and access control."""
        return EntryQuerySet(self.model, using=self._db)

    def non_virtual(self) -> models.QuerySet:
        """Exclude internal/virtual entry classes."""
        return self.get_queryset().non_virtual()

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to entries accessible to the user."""
        return self.get_queryset().accessible(user)

    def is_artifact(self) -> models.QuerySet:
        """Filter to artifact entries only."""
        return self.get_queryset().is_artifact()

    def is_entity(self) -> models.QuerySet:
        """Filter to entity entries only."""
        return self.get_queryset().is_entity()

    def unreferenced(self) -> models.QuerySet:
        """Filter to entries with no relations."""
        return self.get_queryset().unreferenced()


class EntityManager(EntryManager):
    """Manager for Entry querysets restricted to entities."""

    def get_queryset(self) -> models.QuerySet:
        """Return queryset filtered to entity entries only."""
        return super().get_queryset().is_entity()


class ArtifactManager(EntryManager):
    """Manager for Entry querysets restricted to artifacts."""

    def get_queryset(self) -> models.QuerySet:
        """Return queryset filtered to artifact entries only."""
        return super().get_queryset().is_artifact()


class RelationManager(models.Manager):
    """Manager for Relation with access-vector filtering and e1/e2 normalization."""

    def get_queryset(self):
        """Return RelationQuerySet for access-vector filtering."""
        return RelationQuerySet(self.model, using=self._db)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to relations accessible to the user."""
        return self.get_queryset().accessible(user)

    def bulk_create(self, objs, **kwargs):
        """Bulk create relations: normalize e1/e2 order (e1.id <= e2.id), require an entity endpoint."""
        for obj in objs:
            if obj.e1.id > obj.e2.id:
                obj.e1, obj.e2 = obj.e2, obj.e1
            if not self.model.includes_entity(obj.e1, obj.e2):
                raise ValidationError("Each relation must involve at least one entity endpoint.")
        return super().bulk_create(objs, **kwargs)


class EdgeManager(models.Manager):
    """Manager for Edge materialized view with access filtering."""

    def get_queryset(self):
        """Return EdgeQuerySet for access-vector filtering."""
        return EdgeQuerySet(self.model, using=self._db)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Filter to edges accessible to the user."""
        return self.get_queryset().accessible(user)

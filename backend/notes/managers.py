"""Note queryset and manager with access control helpers."""

from typing import Optional
from uuid import UUID

from django.db import models
from django.db.models import Exists, ExpressionWrapper, F, OuterRef, Q, Value

from core.fields import BitStringField
from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


class NoteQuerySet(models.QuerySet):
    def for_entry(self, entry_id: UUID | None) -> models.QuerySet:
        """Return notes that reference the given entry."""
        return self.filter(entries__id=entry_id)

    def holding_file(self, file) -> models.QuerySet:
        """Notes holding the ``FileReference`` ``file`` or a copy of it (same SHA-256)."""
        holds = Q(files__id=file.id)
        if file.sha256_hash:
            holds |= Q(files__sha256_hash=file.sha256_hash)
        return self.filter(holds).distinct()

    def fleeting(self) -> models.QuerySet:
        """Return only fleeting notes."""
        return self.filter(fleeting=True)

    def non_fleeting(self) -> models.QuerySet:
        """Return only non-fleeting notes."""
        return self.filter(fleeting=False)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Return notes accessible by the user."""
        if user.is_cradle_admin:
            return self.filter(Q(fleeting=False) | Q(fleeting=True, author=user))

        v = user.access_vector

        linked_entity = Entry.objects.filter(
            notes__id=OuterRef("pk"),
            entry_class__type=EntryType.ENTITY,
        )
        queryset = self.annotate(
            bit_or=ExpressionWrapper(F("access_vector").bitor(Value(v)), output_field=fieldtype),
            _has_linked_entity=Exists(linked_entity),
        ).filter(
            Q(fleeting=True, author=user)
            | Q(fleeting=False, _has_linked_entity=True, bit_or=v)
            | Q(fleeting=False, _has_linked_entity=False, author=user)
        )

        return queryset


class NoteManager(models.Manager):
    def get_queryset(self):
        """Return NoteQuerySet with custom methods (for_entry, accessible, etc.)."""
        return NoteQuerySet(self.model, using=self._db)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """Notes visible to ``user`` (bitmask + entity links + orphan author-only rule)."""
        return self.get_queryset().accessible(user)

    def get_accessible_notes(self, user: CradleUser, entry_id: Optional[UUID] = None) -> models.QuerySet:
        """Get notes of an entity that the user has access to.

        If entry_id is None, returns all accessible notes.

        Args:
            user: The user whose access is being checked.
            entry_id: The ID of the entity whose notes are being retrieved.

        Returns:
            QuerySet: The notes of the entity that the user has access to or
            all the notes the user has access to if None is provided for
            entry_id.
        """
        if entry_id:
            qs = self.get_queryset().for_entry(entry_id)
        else:
            qs = self.get_queryset()

        return qs.accessible(user).order_by("-timestamp").distinct()

    def fleeting(self) -> models.QuerySet:
        """Return only fleeting notes."""
        return self.get_queryset().fleeting()

    def non_fleeting(self) -> models.QuerySet:
        """Return only non-fleeting notes."""
        return self.get_queryset().non_fleeting()

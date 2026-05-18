"""Note queryset and manager with access control and ordering helpers."""

from typing import List, Optional
from uuid import UUID

from django.db import models
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, OuterRef, Q, Value, When

from core.fields import BitStringField
from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


class NoteQuerySet(models.QuerySet):
    def for_entry(self, entry_id: UUID | None) -> models.QuerySet:
        """Return notes that reference the given entry."""
        return self.filter(entries__id=entry_id)

    def fleeting(self) -> models.QuerySet:
        """Return only fleeting notes."""
        return self.filter(fleeting=True)

    def non_fleeting(self) -> models.QuerySet:
        """Return only non-fleeting notes."""
        return self.filter(fleeting=False)

    def inaccessible(self, user: CradleUser) -> models.QuerySet:
        """Return notes not accessible by the user."""
        if user.is_cradle_admin:
            return self.none()

        v = user.access_vector

        queryset = self.annotate(
            bit_or=ExpressionWrapper(F("access_vector").bitor(Value(v)), output_field=fieldtype)
        ).filter(~Q(bit_or=v))

        return queryset

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

    def get_all_notes(self, entry_id: UUID | str) -> models.QuerySet:
        """Return notes for an entry, ordered by timestamp descending."""
        return self.get_queryset().filter(entries__id=entry_id).order_by("-timestamp")

    def get_entries_from_notes(self, notes: models.QuerySet) -> models.QuerySet:
        """Return distinct entries referenced by the given notes."""
        entries = Entry.objects.filter(notes__in=notes).distinct()

        return entries

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

    def get_in_order(self, note_ids: List) -> models.QuerySet:
        """Return notes in the order specified by the given list of note IDs."""
        ordering = Case(*[When(id=nid, then=pos) for pos, nid in enumerate(note_ids)])
        return self.get_queryset().filter(id__in=note_ids).order_by(ordering)

    def get_links(self, note_list: models.QuerySet) -> models.QuerySet:
        """Return pairs of entries connected by the given notes (first_node < second_node)."""
        connected_entries = Entry.objects.annotate(note_count=Count("notes", filter=Q(notes__id__in=note_list)))

        connected_entries = connected_entries.filter(note_count__gt=0)

        entry_pairs = (
            connected_entries.values(
                first_node=F("id"),
                second_node=F("notes__entries__id"),
            )
            .distinct()
            .filter(first_node__lt=F("second_node"))
        )

        return entry_pairs

    def fleeting(self) -> models.QuerySet:
        """Return only fleeting notes."""
        return self.get_queryset().fleeting()

    def non_fleeting(self) -> models.QuerySet:
        """Return only non-fleeting notes."""
        return self.get_queryset().non_fleeting()

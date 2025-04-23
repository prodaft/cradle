from django.db import models
from django.db.models import Count, Value

from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser
from django.db.models import Case, When, Q, F, ExpressionWrapper

from typing import List
from uuid import UUID
from typing import Optional, Generator

from core.fields import BitStringField

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


class NoteQuerySet(models.QuerySet):
    def for_entry(self, entry_id: UUID | None) -> models.QuerySet:
        """
        Get the notes that belong to an entry
        """
        return self.filter(entries__id=entry_id)

    def inaccessible(self, user: CradleUser) -> models.QuerySet:
        """
        Get the notes that are not accessible by the current user
        """
        if user.is_cradle_admin:
            return self.none()

        v = user.access_vector

        queryset = self.annotate(
            bit_or=ExpressionWrapper(
                F("access_vector").bitor(Value(v)), output_field=fieldtype
            )
        ).filter(~Q(bit_or=v))

        return queryset

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Get the notes that are accessible by the current user
        """
        if user.is_cradle_admin:
            return self

        v = user.access_vector

        queryset = self.annotate(
            bit_or=ExpressionWrapper(
                F("access_vector").bitor(Value(v)), output_field=fieldtype
            )
        ).filter(bit_or=v)

        return queryset


class NoteManager(models.Manager):
    def get_queryset(self):
        """
        Returns a queryset that uses the custom TeamQuerySet,
        allowing access to its methods for all querysets retrieved by this manager.
        """
        return NoteQuerySet(self.model, using=self._db)

    def get_all_notes(self, entry_id: UUID | str) -> models.QuerySet:
        """Gets the notes of an entry ordered by timestamp in descending order

        Args:
            entry_id (UUID): The id of the entry

        Returns:
            models.QuerySet: The notes of the entry
                ordered by timestamp in descending order

        """
        return self.get_queryset().filter(entries__id=entry_id).order_by("-timestamp")

    def get_entries_from_notes(
        self,
        notes: models.QuerySet,
    ) -> models.QuerySet:
        """Gets the entries from a QuerySet of notes

        Args:
            notes: The QuerySet containing the notes
            entry_type: The type of the entry to filter by

        Returns:
            models.QuerySet: The entries referenced by the notes
        """
        entries = Entry.objects.filter(notes__in=notes).distinct()

        return entries

    def get_accessible_notes(
        self, user: CradleUser, entry_id: Optional[UUID] = None
    ) -> models.QuerySet:
        """Get the notes of an entity that the user has access to.
        If None is provided as a parameter, then the method returns all
        accessible notes.

        Args:
            user: The user whose access is being checked
            entry_id: The id of the entiy whose notes are being retrieved

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

    def get_inaccessible_notes(self, user: CradleUser, entry_id: Optional[UUID] = None):
        """Get the notes a user does not have any access to.

        Args:
            user: The user whose access is being checked
            entry_id: The id of the entiy whose notes are being retrieved

        Returns:
            QuerySet: The notes that the user does not have access to
        """
        if entry_id:
            qs = self.get_queryset().for_entry(entry_id)
        else:
            qs = self.get_queryset()

        return qs.inaccessible(user).order_by("-timestamp").distinct()

    def get_in_order(self, note_ids: List) -> models.QuerySet:
        """Gets the notes in the order specified by the given list of note IDs.

        Args:
            note_ids (List[int]): A list of note IDs specifying the order in
                which the notes should be fetched.

        Returns:
            models.QuerySet: A QuerySet of Note objects ordered according to
                the specified list of note IDs.
        """
        ordering = Case(*[When(id=id, then=pos) for pos, id in enumerate(note_ids)])
        return self.get_queryset().filter(id__in=note_ids).order_by(ordering)

    def get_links(self, note_list: models.QuerySet) -> models.QuerySet:
        """Given a list of note ids, retrieve pairs of entries connected
        by those notes.

        Args:
            note_list (models.QuerySet): The list of note ids.

        Returns:
            models.QuerySet: The pairs of entries linked using notes.

        """
        connected_entries = Entry.objects.annotate(
            note_count=Count("notes", filter=Q(notes__id__in=note_list))
        )

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

    def note_references_iterator(
        self, note_list: models.QuerySet, entry_type: EntryType
    ) -> Generator:
        """Given a QuerySet of Notes, returns an iterator over all
        entries references in those Notes, that have the specified
        Entry Type.

        Args:
            note_list (models.QuerySet): The QuerySet of Notes
            entry_type (entries.EntryType): The EntryType entries
                need to match

        Returns:
            Generator: The iterator over the entries

        """

        returned_entries = set()

        for note in note_list:
            for entry in note.entries.filter(entry_class__type=entry_type):
                if entry not in returned_entries:
                    returned_entries.add(entry)
                    yield entry

    def get_accessible_artifact_ids(self, user: CradleUser) -> models.QuerySet:
        """For a given user id, get a list of all artifact ids which
        are accessible by the user. An artifact is considered to be accessible by the
        user when it is referenced in at least one note that the user has access to.
        This method does not take into consideration the access privileges of the user.
        Hence, this method should not be used for admin users.

        Args:
            user_id: the id of the user.

        Returns:
            A QuerySet instance which gives all the artifact ids to which the user
            has access.
        """

        return (
            self.get_entries_from_notes(self.get_accessible_notes(user))
            .filter(entry_class__type=EntryType.ARTIFACT)
            .values("id")
            .distinct()
        )

"""Validate note references: entry classes exist, entities exist, min counts met."""

from collections import defaultdict
from typing import Iterable, Tuple

from django.conf import settings
from django.db.models import Q

from entries.enums import EntryType
from entries.exceptions import AliasCannotBeLinkedException, InvalidEntryException
from entries.models import Entry, EntryClass
from management.settings import cradle_settings

from ..exceptions import (
    EntriesDoNotExistException,
    EntryClassesDoNotExistException,
    NotEnoughReferencesException,
)
from ..models import Note
from .base_task import BaseTask


class ValidateNoteTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return True

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """Validate note references: entry classes, entities, and minimum counts.

        Args:
            note: The note being processed.
            entries: Entries from previous tasks (unused; this is the first task).

        Returns:
            Tuple of (None, validated entries).

        Raises:
            AliasCannotBeLinkedException: If note links to internal subtype.
            EntryClassesDoNotExistException: If referenced entry classes do not exist.
            EntriesDoNotExistException: If referenced entities do not exist.
            InvalidEntryException: If entry value fails validation.
            NotEnoughReferencesException: If minimum entity/entry counts not met.
        """
        links = note.reference_tree.all_links(ignore_connectors=True)
        unique_subtypes = {r.key for r in links}

        # Check if the note tries to link to an internal subtype (e.g. alias)
        if unique_subtypes & settings.INTERNAL_SUBTYPES:
            raise AliasCannotBeLinkedException()

        # Prefetch all relevant EntryClass objects in one query
        eclasses = EntryClass.objects.filter(subtype__in=unique_subtypes)
        eclass_cache = {e.subtype: e for e in eclasses}

        eclass_name_pairs = []
        for r in links:
            eclass = eclass_cache.get(r.key)
            if eclass:
                eclass_name_pairs.append((eclass, r.value))

        entry_conditions = Q()
        eclass_names_map = defaultdict(set)

        for eclass, name in eclass_name_pairs:
            eclass_names_map[eclass].add(name)

        for eclass, names in eclass_names_map.items():
            entry_conditions |= Q(entry_class=eclass, name__in=names)

        entries_dict = {}
        if entry_conditions:
            entries_qs = Entry.objects.filter(entry_conditions).order_by("id")

            for entry in entries_qs:
                key = (entry.entry_class.subtype, entry.name)
                if key not in entries_dict:
                    entries_dict[key] = entry

        entity_count = 0
        total_count = 0
        entries = []

        for r in links:
            eclass = eclass_cache.get(r.key)
            if eclass:
                if eclass.type == EntryType.ENTITY:
                    entity_count += 1
                total_count += 1

                entry_key = (eclass.subtype, r.value)
                if entry_key not in entries_dict:
                    if eclass.type == EntryType.ENTITY:
                        raise EntriesDoNotExistException([r])

                    if not eclass.validate_text(r.value):
                        raise InvalidEntryException(eclass.subtype, r.value)
                else:
                    entries.append(entries_dict[entry_key])

            elif cradle_settings.notes.allow_dynamic_entry_class_creation:
                total_count += 1
            else:
                raise EntryClassesDoNotExistException([r.key])

        if entity_count < cradle_settings.notes.min_entities or total_count < cradle_settings.notes.min_entries:
            raise NotEnoughReferencesException()

        return None, entries

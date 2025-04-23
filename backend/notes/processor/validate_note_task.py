from typing import Iterable, Tuple
from entries.exceptions import AliasCannotBeLinked, InvalidEntryException
from entries.models import Entry, EntryClass
from django.db.models import Q
from notes.exceptions import (
    EntriesDoNotExistException,
    EntryClassesDoNotExistException,
    NotEnoughReferencesException,
)
from entries.enums import EntryType

from .base_task import BaseTask
from ..models import Note

from collections import defaultdict


from management.settings import cradle_settings


class ValidateNoteTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return True

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        links = note.reference_tree.links()
        unique_subtypes = {r.key for r in links}

        # Check if the note tries to link to an alias
        if "alias" in unique_subtypes or "connector" in unique_subtypes:
            raise AliasCannotBeLinked()

        # Prefetch all relevant EntryClass objects in one query
        eclasses = EntryClass.objects.filter(subtype__in=unique_subtypes)
        eclass_cache = {e.subtype: e for e in eclasses}

        for key in unique_subtypes:
            if key not in eclass_cache:
                eclass_cache[key] = None

        eclass_name_pairs = []

        for r in links:
            eclass = eclass_cache[r.key]
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
            eclass = eclass_cache[r.key]

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

        if entity_count < cradle_settings.notes.min_entities:
            raise NotEnoughReferencesException()

        if total_count < cradle_settings.notes.min_entries:
            raise NotEnoughReferencesException()

        return None, entries

"""Validate note references: entry classes exist, entities exist, min counts met."""

from collections import defaultdict
from typing import Iterable, Tuple

from django.db.models import Q

from entries.constants import INTERNAL_SUBTYPES
from entries.enums import EntryType
from entries.exceptions import InvalidEntryException, NoteReferenceNotAllowedException
from entries.models import Entry, EntryClass
from management.settings import system_settings

from ..exceptions import (
    EntriesNotFoundException,
    EntryTypesNotFoundException,
    NoteLinkIssue,
    NotEnoughReferencesException,
    with_link_issues,
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
            Problems are collected and raised together: the first one's exception, with every
            message in its detail, every problem link in ``link_issues`` and the entries that
            did resolve in ``valid_entries`` (see ``with_link_issues``).
            NoteReferenceNotAllowedException: If note links to internal subtype.
            EntryTypesNotFoundException: If referenced entry types do not exist.
            EntriesNotFoundException: If referenced entities do not exist.
            InvalidEntryException: If entry value fails validation.
            NotEnoughReferencesException: If minimum entity/entry counts not met.
        """
        links = note.reference_tree.all_links(ignore_connectors=True)
        errors = []
        issues: list[NoteLinkIssue] = []

        if blocked := sorted({r.key for r in links} & INTERNAL_SUBTYPES):
            listed = ", ".join(f"[[{subtype}:...]]" for subtype in blocked)
            errors.append(NoteReferenceNotAllowedException(detail=f"Notes cannot link to these entry types: {listed}."))
            issues += [{"code": "not_allowed", "key": subtype, "value": None} for subtype in blocked]
            links = {r for r in links if r.key not in blocked}
        unique_subtypes = {r.key for r in links}

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
        unknown_types: list[str] = []
        missing = []
        invalid: list[tuple[str, str]] = []

        for r in sorted(links, key=lambda link: (link.key, link.value)):
            eclass = eclass_cache.get(r.key)
            if eclass:
                if eclass.type == EntryType.ENTITY:
                    entity_count += 1
                total_count += 1

                entry_key = (eclass.subtype, r.value)
                if entry_key not in entries_dict:
                    if eclass.type == EntryType.ENTITY:
                        missing.append(r)
                    elif not eclass.validate_text(r.value):
                        invalid.append((eclass.subtype, r.value))
                else:
                    entries.append(entries_dict[entry_key])

            elif system_settings.notes.allow_dynamic_entry_class_creation:
                total_count += 1
            elif r.key not in unknown_types:
                unknown_types.append(r.key)

        if unknown_types:
            errors.append(EntryTypesNotFoundException(unknown_types))
            issues += [{"code": "unknown_type", "key": key, "value": None} for key in unknown_types]
        if missing:
            errors.append(EntriesNotFoundException(missing))
            issues += [{"code": "missing_entry", "key": r.key, "value": r.value} for r in missing]
        for subtype, value in invalid:
            errors.append(InvalidEntryException(subtype, value))
            issues.append({"code": "invalid_value", "key": subtype, "value": value})
        if errors:
            raise with_link_issues(errors, issues, entries)

        if entity_count < system_settings.notes.min_entities or total_count < system_settings.notes.min_entries:
            raise with_link_issues([NotEnoughReferencesException()], [], entries)

        return None, entries

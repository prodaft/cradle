from typing import Generator

from django.db import models
from entries.enums import EntryType


def note_artifacts_iterator(note_list: models.QuerySet) -> Generator:
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
        # Use prefetched data to avoid N+1 queries
        for entry in note.entries.all():
            if (
                hasattr(entry, "entry_class")
                and entry.entry_class
                and entry.entry_class.type == EntryType.ARTIFACT
                and entry.entry_class.subtype not in ("virtual", "file")
                and entry not in returned_entries
            ):
                returned_entries.add(entry)
                yield entry

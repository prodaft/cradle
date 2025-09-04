from django.db import models
from entries.enums import EntryType
from typing import Generator


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
        for entry in note.entries.filter(
            entry_class__type=EntryType.ARTIFACT
        ).non_virtual():
            if entry not in returned_entries:
                returned_entries.add(entry)
                yield entry

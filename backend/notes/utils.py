"""Utilities for notes: access vector calculation."""

from collections.abc import Iterable

from entries.models import Entry


def calculate_acvec(entries: Iterable[Entry]):
    """Compute access vector bitmask from entity entries."""
    acvec = 1

    for e in entries:
        acvec |= 1 << e.acvec_offset

    return acvec

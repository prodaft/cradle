"""Utilities for notes: link extraction and access vector calculation."""

import re
from collections.abc import Iterable
from typing import Iterator, NamedTuple

from entries.models import Entry

from .markdown.constants import LINK_REGEX


class CradleLinkRef(NamedTuple):
    """Tuple of (entry_class subtype, entry name) from a cradle link."""

    class_subtype: str
    name: str


def extract_links(s: str) -> Iterator[CradleLinkRef]:
    """Extract cradle links [[type:value|alias]] from text. Yields (class_subtype, name) tuples."""
    for match in re.finditer(LINK_REGEX, s):
        yield CradleLinkRef(match.group("cl_type"), match.group("cl_value"))


def calculate_acvec(entries: Iterable[Entry]):
    """Compute access vector bitmask from entity entries."""
    acvec = 1

    for e in entries:
        acvec |= 1 << e.acvec_offset

    return acvec

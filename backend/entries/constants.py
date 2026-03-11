"""Entry-related constants: internal subtypes and defaults."""

from entries.enums import EntryType

INTERNAL_SUBTYPES = frozenset({"alias", "note", "file", "digest", "enrichment"})

SUBTYPE_ALIAS = "alias"
SUBTYPE_NOTE = "note"
SUBTYPE_FILE = "file"
SUBTYPE_DIGEST = "digest"
SUBTYPE_ENRICHMENT = "enrichment"

INTERNAL_ENTRY_CLASS_DEFAULTS = {
    SUBTYPE_NOTE: {"type": EntryType.ARTIFACT, "color": "#7f8389"},
    SUBTYPE_FILE: {"type": EntryType.ARTIFACT, "color": "#7f8389"},
    SUBTYPE_ALIAS: {"type": EntryType.ARTIFACT, "color": "#7f8389"},
    SUBTYPE_DIGEST: {"type": EntryType.ARTIFACT},
    SUBTYPE_ENRICHMENT: {"type": EntryType.ARTIFACT},
}

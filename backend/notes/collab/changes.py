r"""Server-side handling of CodeMirror ``ChangeSet`` JSON.

CodeMirror measures positions in UTF-16 code units (JavaScript string length), so the
text is converted to UTF-16 before applying changes; Python string indices would drift
on characters outside the Basic Multilingual Plane (e.g. emoji).

``ChangeSet.toJSON()`` produces a list of sections:

* ``n`` - keep ``n`` units unchanged
* ``[n]`` - delete ``n`` units
* ``[n, line1, line2, ...]`` - replace ``n`` units with the lines joined by ``\n``
"""

from typing import Any

UTF16 = "utf-16-le"


class InvalidChangeSet(ValueError):
    """The change set is malformed or does not match the document length."""


def utf16_len(text: str) -> int:
    """Length of ``text`` as CodeMirror counts it (UTF-16 code units)."""
    return len(text.encode(UTF16, "surrogatepass")) // 2


def normalize_newlines(text: str) -> str:
    r"""CodeMirror splits lines on ``\r\n``, ``\r`` and ``\n`` and joins with ``\n``."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def apply_changes(doc: str, changes: Any) -> str:
    """Apply change set JSON to ``doc``; raises ``InvalidChangeSet`` if it does not fit."""
    if not isinstance(changes, list):
        raise InvalidChangeSet("change set must be a list")

    src = doc.encode(UTF16, "surrogatepass")
    total = len(src) // 2
    pos = 0
    out: list[bytes] = []

    for section in changes:
        if isinstance(section, int) and not isinstance(section, bool):
            length, inserted = section, None
        elif (
            isinstance(section, list)
            and section
            and isinstance(section[0], int)
            and not isinstance(section[0], bool)
            and all(isinstance(line, str) for line in section[1:])
        ):
            length, inserted = section[0], section[1:]
        else:
            raise InvalidChangeSet(f"invalid section: {section!r}")

        if length < 0 or pos + length > total:
            raise InvalidChangeSet("change set does not match the document length")

        if inserted is None:
            out.append(src[pos * 2 : (pos + length) * 2])
        elif inserted:
            out.append("\n".join(inserted).encode(UTF16, "surrogatepass"))
        pos += length

    if pos != total:
        raise InvalidChangeSet("change set does not match the document length")

    return b"".join(out).decode(UTF16, "surrogatepass")


def replace_all(old: str, new: str) -> list:
    """Change set JSON that replaces the whole of ``old`` with ``new``."""
    old_len = utf16_len(old)
    if not old and not new:
        return []
    if not new:
        return [[old_len]]
    return [[old_len, *new.split("\n")]]

"""Markdown parsing constants (regex fragments)."""

from mistune.helpers import LINK_LABEL

ENTRY_LINK_REGEX = (
    r"(?P<el_hidden>~)?\[\[(?P<el_type>[^:\|\]]+?):(?P<el_value>(?:\\[\[\]\|]|[^\[\]\|])+?)"
    + r"(?:\|(?P<el_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"
    + r"(?:\((?:(?P<el_time>\d{2}:\d{2}\s+)?(?P<el_date>\d{2}-\d{2}-\d{4}))\))?"
)
INLINE_FOOTNOTE = r"\[(?P<footnote_value>" + LINK_LABEL + r")\]\[(?P<footnote_key>" + LINK_LABEL + r")\]"
INLINE_FOOTNOTE_IMG = r"!\[(?P<img_footnote_value>" + LINK_LABEL + r")\]\[(?P<img_footnote_key>" + LINK_LABEL + r")\]"

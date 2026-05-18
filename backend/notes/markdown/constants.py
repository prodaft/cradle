"""Markdown parsing constants (regex fragments)."""

from mistune.helpers import LINK_LABEL

LINK_REGEX = (
    r"(?P<cl_hidden>~)?\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)"
    + r"(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"
    + r"(?:\((?:(?P<cl_time>\d{2}:\d{2}\s+)?(?P<cl_date>\d{2}-\d{2}-\d{4}))\))?"
)
INLINE_FOOTNOTE = r"\[(?P<footnote_value>" + LINK_LABEL + r")\]\[(?P<footnote_key>" + LINK_LABEL + r")\]"
INLINE_FOOTNOTE_IMG = r"!\[(?P<img_footnote_value>" + LINK_LABEL + r")\]\[(?P<img_footnote_key>" + LINK_LABEL + r")\]"

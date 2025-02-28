from typing import Any, Dict, Match, Optional
from mistune import InlineParser, InlineState, Markdown
from mistune.helpers import LINK_LABEL

# Common regex patterns
LINK_REGEX = r"\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"
INLINE_FOOTNOTE = r"\[(?P<footnote_value>" + LINK_LABEL + r")\]\[(?P<footnote_key>" + LINK_LABEL + r")\]"
INLINE_FOOTNOTE_IMG = r"!\[(?P<img_footnote_value>" + LINK_LABEL + r")\]\[(?P<img_footnote_key>" + LINK_LABEL + r")\]"

def parse_cradle_link(inline: "InlineParser", m: Match[str], state: "InlineState") -> int:
    """Parse a cradle link of the form [[type:value|alias]]."""
    pos = m.end()
    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group("cl_type").strip(),
                "value": m.group("cl_value").strip(),
                "alias": m.group("cl_alias").strip() if m.group("cl_alias") else None,
            },
        }
    )
    return pos

def parse_footnote(inline: "InlineParser", m: Match[str], state: "InlineState") -> int:
    """Parse a footnote reference of the form [text][key]."""
    key = m.group("footnote_key")
    value = m.group("footnote_value")
    ref = state.env.get("ref_footnotes")

    if ref and key in ref:
        state.append_token(
            {
                "type": "footnote_ref",
                "raw": key,
                "attrs": {"key": key, "value": value, "ref": ref[key]},
            }
        )
    else:
        state.append_token({"type": "text", "raw": m.group(0)})

    return m.end()

def parse_img_footnote(inline: "InlineParser", m: Match[str], state: "InlineState") -> int:
    """Parse an image footnote reference of the form ![text][key]."""
    key = m.group("img_footnote_key")
    value = m.group("img_footnote_value")
    ref = state.env.get("ref_footnotes")

    if ref and key in ref:
        state.append_token(
            {
                "type": "img_footnote_ref",
                "raw": key,
                "attrs": {"key": key, "value": value, "ref": ref[key]},
            }
        )
    else:
        state.append_token({"type": "text", "raw": m.group(0)})

    return m.end()

def cradle_link_plugin(md: "Markdown") -> None:
    """Plugin to enable cradle link parsing."""
    md.inline.register("url_link", LINK_REGEX, parse_cradle_link, before="link")

def footnote_plugin(md: "Markdown") -> None:
    md.inline.register("footnote", INLINE_FOOTNOTE, parse_footnote, before="link")
    md.inline.register("img_footnote", INLINE_FOOTNOTE_IMG, parse_img_footnote, before="link") 
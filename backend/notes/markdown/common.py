from typing import Match
from mistune import InlineParser, InlineState, Markdown
from mistune.helpers import LINK_LABEL
import datetime
from django.utils.timezone import make_aware
import frontmatter


# Common regex patterns
LINK_REGEX = (
    r"\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)"
    + r"(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"
    + r"(?:\((?:(?P<cl_time>\d{2}:\d{2}\s+)?(?P<cl_date>\d{2}-\d{2}-\d{4}))\))?"
)
INLINE_FOOTNOTE = (
    r"\[(?P<footnote_value>"
    + LINK_LABEL
    + r")\]\[(?P<footnote_key>"
    + LINK_LABEL
    + r")\]"
)
INLINE_FOOTNOTE_IMG = (
    r"!\[(?P<img_footnote_value>"
    + LINK_LABEL
    + r")\]\[(?P<img_footnote_key>"
    + LINK_LABEL
    + r")\]"
)


class ErrorBypassYAMLHandler(frontmatter.YAMLHandler):
    def load(self, *args, **kwargs):
        try:
            return super().load(*args, **kwargs)
        except Exception:
            return {}


def parse_cradle_link(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
    """Parse a cradle link of the form [[type:value|alias]] (HH:MM dd-mm-yyyy)."""
    pos = m.end()

    # Extract timestamp components
    time = m.group("cl_time").strip() if m.group("cl_time") else None
    date = m.group("cl_date") if m.group("cl_date") else None

    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group("cl_type").strip(),
                "value": m.group("cl_value").strip(),
                "alias": m.group("cl_alias").strip() if m.group("cl_alias") else None,
                "time": (
                    make_aware(datetime.datetime.strptime(time, "%H:%M"))
                    if time
                    else None
                ),
                "date": (
                    make_aware(datetime.datetime.strptime(date, "%d-%m-%Y"))
                    if date
                    else None
                ),
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


def parse_img_footnote(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
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
    md.inline.register(
        "img_footnote", INLINE_FOOTNOTE_IMG, parse_img_footnote, before="link"
    )

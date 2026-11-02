"""Markdown utilities: entry link regex, YAML handler, image embedding, plugins."""

import base64
import datetime
import mimetypes
from io import BytesIO
from typing import Match

import frontmatter
import yaml
from django.utils.timezone import make_aware
from mistune import InlineParser, Markdown
from mistune.core import InlineState

from ..exceptions import InvalidDateFormatException
from .constants import ENTRY_LINK_REGEX, INLINE_FOOTNOTE, INLINE_FOOTNOTE_IMG


def parse_entry_date(v: str) -> datetime.datetime:
    """Parse date string (HH:MM dd-mm-yyyy or dd-mm-yyyy). Raises InvalidDateFormatException on invalid format."""
    if ":" in v and " " in v:
        time_part, _ = v.split(" ", 1)
        if ":" in time_part:
            try:
                return make_aware(datetime.datetime.strptime(v, "%H:%M %d-%m-%Y"))
            except ValueError:
                raise InvalidDateFormatException("")
    try:
        return make_aware(datetime.datetime.strptime(v, "%d-%m-%Y"))
    except ValueError:
        raise InvalidDateFormatException("")


def embed_image_as_data_url(img: BytesIO, path: str) -> str:
    """Encode image bytes as a data URL. Uses mimetypes for MIME detection."""
    data = img.read()
    img.close()
    mime, _ = mimetypes.guess_type(path)
    if not mime or not mime.startswith("image/"):
        mime = "image/png"
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"


class ErrorBypassYAMLHandler(frontmatter.YAMLHandler):
    """YAML handler that returns empty dict on parse errors instead of raising."""

    def load(self, *args, **kwargs):
        try:
            result = super().load(*args, **kwargs)
            return result if result is not None else {}
        except yaml.YAMLError:
            return {}


def parse_entry_link(inline: InlineParser, m: Match[str], state: InlineState) -> int:
    """Parse an entry link of the form [[type:value|alias]] (HH:MM dd-mm-yyyy)."""
    time = m.group("el_time").strip() if m.group("el_time") else None
    date = m.group("el_date") if m.group("el_date") else None

    try:
        state.append_token(
            {
                "type": "entry_link",
                "attrs": {
                    "key": m.group("el_type").strip(),
                    "value": m.group("el_value").strip(),
                    "hidden": bool(m.group("el_hidden")),
                    "alias": m.group("el_alias").strip() if m.group("el_alias") else None,
                    "time": (make_aware(datetime.datetime.strptime(time, "%H:%M")) if time else None),
                    "date": (make_aware(datetime.datetime.strptime(date, "%d-%m-%Y")) if date else None),
                },
            }
        )
    except ValueError:
        raise InvalidDateFormatException("")
    return m.end()


def _parse_footnote_ref(
    m: Match[str],
    state: InlineState,
    token_type: str,
    key_group: str,
    value_group: str,
) -> int:
    """Parse footnote reference [text][key] or ![text][key]; fallback to plain text if ref missing."""
    key = m.group(key_group)
    value = m.group(value_group)
    ref = state.env.get("ref_footnotes")

    if ref and key in ref:
        state.append_token({"type": token_type, "raw": key, "attrs": {"key": key, "value": value, "ref": ref[key]}})
    else:
        state.append_token({"type": "text", "raw": m.group(0)})

    return m.end()


def parse_footnote(inline: InlineParser, m: Match[str], state: InlineState) -> int:
    """Parse a footnote reference of the form [text][key]."""
    return _parse_footnote_ref(m, state, "footnote_ref", "footnote_key", "footnote_value")


def parse_img_footnote(inline: InlineParser, m: Match[str], state: InlineState) -> int:
    """Parse an image footnote reference of the form ![text][key]."""
    return _parse_footnote_ref(m, state, "img_footnote_ref", "img_footnote_key", "img_footnote_value")


def entry_link_plugin(md: Markdown) -> None:
    """Plugin to enable entry link parsing."""
    md.inline.register("entry_link", ENTRY_LINK_REGEX, parse_entry_link, before="link")


def footnote_plugin(md: Markdown) -> None:
    """Plugin to enable footnote parsing ([text][key] and ![text][key])."""
    md.inline.register("footnote", INLINE_FOOTNOTE, parse_footnote, before="link")
    md.inline.register("img_footnote", INLINE_FOOTNOTE_IMG, parse_img_footnote, before="link")

import json
from collections.abc import Iterable
from typing import Any, Dict, List, Match, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState

from mistune.markdown import Markdown
import itertools
from mistune import InlineParser, InlineState
from mistune.renderers.markdown import MarkdownRenderer
from .table import table

LINK_REGEX = r"\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"  # noqa: E501 to avoid splitting the regex on two lines


def parse_cradle_link(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
    pos = m.end()

    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group("cl_type").strip(),
                "value": m.group("cl_value").strip(),
                "alias": m.group("cl_alias").strip()
                if m.group("cl_alias")
                else m.group("cl_alias"),
            },
        }
    )

    return pos


def cradle_link(md: "Markdown") -> None:
    md.inline.register("url_link", LINK_REGEX, parse_cradle_link, before="link")


class MarkdownRendererWithCradle(MarkdownRenderer):
    """A renderer for converting Markdown to HTML."""

    NAME = "cradle_markdown"

    def __init__(
        self,
        entryclass_remap: Dict[str, str] = {},
    ) -> None:
        self.entryclass_remap = entryclass_remap
        super(MarkdownRendererWithCradle, self).__init__()

    def cradle_link(self, token: Dict[str, any], state: BlockState) -> str:
        key, value, alias = (
            token["attrs"].get("key"),
            token["attrs"].get("value"),
            token["attrs"].get("alias"),
        )

        key = self.entryclass_remap.get(key, key)

        if key is None:
            if alias:
                return f"{value} ({alias})"

            return value

        if alias:
            return f"[[{key}:{value}|{alias}]]"

        return f"[[{key}:{value}]]"

    def table(self, token: Dict[str, any], state: BlockState) -> str:
        return self.render_children(token, state)

    def table_head(self, token: Dict[str, any], state: BlockState) -> str:
        text = self.render_children(token, state) + "|\n"
        for _ in range(len(token["children"])):
            text += "|---"
        text += "|\n"
        return text

    def table_body(self, token: Dict[str, any], state: BlockState) -> str:
        return self.render_children(token, state)

    def table_row(self, token: Dict[str, any], state: BlockState) -> str:
        text = self.render_children(token, state) + "|\n"
        return text

    def table_cell(self, token: Dict[str, any], state: BlockState) -> str:
        return "| " + self.render_children(token, state).replace("|", "\\|") + " "


def remap_links(
    md: str,
    entryclass_remap: Dict[str, str],
) -> str:
    # Create a renderer instance
    renderer = MarkdownRendererWithCradle(entryclass_remap=entryclass_remap)

    # Create a Markdown instance using the renderer
    markdown = mistune.create_markdown(renderer=renderer, plugins=[table, cradle_link])

    # Render the sample Markdown string
    result, state = markdown.parse(md)

    # Print or return the result
    return result

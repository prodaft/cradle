import json
from collections.abc import Iterable
from typing import Any, Dict, List, Match, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState

from mistune.markdown import Markdown
import itertools
from mistune import InlineParser, InlineState
from mistune.renderers.markdown import MarkdownRenderer as BaseMarkdownRenderer
from .table import table

from .common import cradle_link_plugin, footnote_plugin
from xeger import Xeger
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from entries.models import EntryClass


class Anonymizer:
    def __init__(self):
        self.value_map = {}
        self.x = Xeger(limit=16)

    def anonymize(self, entry_class: "EntryClass", orig_value: str) -> str:
        """Generate anonymized value based on entry class rules."""
        key = (entry_class.subtype, orig_value)
        if key in self.value_map:
            return self.value_map[key]

        if entry_class.options:
            options = [
                opt.strip() for opt in entry_class.options.split("\n") if opt.strip()
            ]
            if options:
                index = random.randint(0, len(options) - 1)

                value = options[index]

        elif entry_class.regex:
            value = self.x.xeger(entry_class.regex)

        elif entry_class.prefix:
            value = f"{entry_class.prefix}{random.randint(1, 1000)}"

        else:
            value = self.x.xeger(r"\w{16}")

        self.value_map[key] = value
        return value



class MarkdownRenderer(BaseMarkdownRenderer):
    """A renderer for converting Markdown to markdown, with changes."""

    NAME = "markdown"

    def __init__(
        self,
        entryclass_remap: Dict[str, str] = {},
    ) -> None:
        self.entryclass_remap = entryclass_remap
        super(MarkdownRenderer, self).__init__()

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

class AnonymizedMarkdownRenderer(MarkdownRenderer):
    """A renderer for creating anonymized Markdown with randomized cradle links."""

    def __init__(self, entry_classes: Dict[str, "EntryClass"], anonymizer: Anonymizer):
        super().__init__()
        self.entry_classes = entry_classes
        self.anonymizer = anonymizer

    def cradle_link(self, token: Dict[str, Any], state: BlockState) -> str:
        """Render anonymized cradle links."""
        key = token["attrs"].get("key", "")
        value = token["attrs"].get("value", "")
        eclass = self.entry_classes.get(key)
        if eclass is None:
            raise ValueError(f"Entry class not found: {key}")

        anonymized_value = self.anonymizer.anonymize(eclass, value)

        return f"[[{key}:{anonymized_value}]]"


def anonymize_markdown(
    md: str,
    entry_classes: Dict[str, "EntryClass"],
    anonymizer: Anonymizer,
) -> str:
    """
    Create an anonymized version of markdown content by replacing cradle links.

    :param md: Original markdown content
    :param entry_classes: Dictionary of "EntryClass" instances by subtype
    :return: Anonymized markdown content
    """
    renderer = AnonymizedMarkdownRenderer(entry_classes, anonymizer)
    markdown = mistune.create_markdown(
        renderer=renderer, 
        plugins=[cradle_link_plugin, table]
    )
    return markdown(md)


def remap_links(
    md: str,
    entryclass_remap: Dict[str, str],
) -> str:
    renderer = MarkdownRenderer(entryclass_remap=entryclass_remap)

    markdown = mistune.create_markdown(
        renderer=renderer, 
        plugins=[table, cradle_link_plugin]
    )

    result, state = markdown.parse(md)

    return result

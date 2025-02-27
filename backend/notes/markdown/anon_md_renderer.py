import hashlib
import itertools
import json
import random
from collections.abc import Iterable
from typing import Any, Dict, List, Match, Optional, Set, Tuple

import mistune
import rstr
from mistune import InlineParser, InlineState
from mistune.core import BaseRenderer, BlockState
from mistune.markdown import Markdown
from mistune.renderers.markdown import MarkdownRenderer

from entries.models import EntryClass
from notes.utils import LINK_REGEX
from xeger import Xeger

from .md_renderer import MarkdownRendererWithCradle
from .table import table


def parse_cradle_link(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
    pos = m.end()

    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group("cl_type"),
                "value": m.group("cl_value"),
                "alias": m.group("cl_alias"),
            },
        }
    )

    return pos


def cradle_link(md: "Markdown") -> None:
    md.inline.register("url_link", LINK_REGEX, parse_cradle_link, before="link")


class Anonymizer:
    def __init__(self):
        self.value_map = {}
        self.x = Xeger(limit=16)

    def anonymize(self, entry_class: EntryClass, orig_value: str) -> str:
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


class AnonymizedMarkdownRenderer(MarkdownRendererWithCradle):
    """A renderer for creating anonymized Markdown with randomized cradle links."""

    def __init__(self, entry_classes: Dict[str, EntryClass], anonymizer: Anonymizer):
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
    entry_classes: Dict[str, EntryClass],
    anonymizer: Anonymizer,
) -> str:
    """
    Create an anonymized version of markdown content by replacing cradle links.

    :param md: Original markdown content
    :param entry_classes: Dictionary of EntryClass instances by subtype
    :return: Anonymized markdown content
    """
    renderer = AnonymizedMarkdownRenderer(entry_classes, anonymizer)
    markdown = mistune.create_markdown(renderer=renderer, plugins=[cradle_link, table])
    return markdown(md)

"""Convert markdown with cradle links; supports remapping and anonymization."""

import random
from typing import TYPE_CHECKING, Any, Dict, Tuple

import mistune
from mistune.core import BlockState
from mistune.plugins.table import table
from mistune.renderers.markdown import MarkdownRenderer as BaseMarkdownRenderer
from xeger import Xeger

from .block_parser import NewlineAwareBlockParser
from .utils import cradle_link_plugin, footnote_plugin

if TYPE_CHECKING:
    from entries.models import EntryClass


class Anonymizer:
    """Maps cradle link values to anonymized replacements for reports."""

    def __init__(self):
        self.value_map = {}
        self.x = Xeger(limit=16)

    def anonymize(self, entry_class: "EntryClass", orig_value: str) -> str:
        """Generate anonymized value based on entry class rules."""
        key = (entry_class.subtype, orig_value)
        if key in self.value_map:
            return self.value_map[key]

        if entry_class.options:
            options = [opt.strip() for opt in entry_class.options.split("\n") if opt.strip()]
            if options:
                value = random.choice(options)
            else:
                value = self.x.xeger(r"\w{16}")
        elif entry_class.prefix:
            value = f"{entry_class.prefix}{random.randint(1, 1000)}"

        elif entry_class.generative_regex:
            value = self.x.xeger(entry_class.generative_regex)

        elif entry_class.regex:
            value = self.x.xeger(entry_class.regex)

        else:
            value = self.x.xeger(r"\w{16}")  # TODO: Pick random word instead

        self.value_map[key] = value
        return value


class MarkdownRenderer(BaseMarkdownRenderer):
    """A renderer for converting Markdown to markdown, with changes."""

    NAME = "markdown"

    def __init__(
        self,
        entryclass_remap: Dict[str, str] | None = None,
        entry_remap: Dict[Tuple[str, str], str | None] | None = None,
    ) -> None:
        self.entryclass_remap = entryclass_remap or {}
        self.entry_remap = entry_remap or {}
        super().__init__()

    def paragraph(self, token: Dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state)
        return text + "\n"

    def cradle_link(self, token: Dict[str, Any], state: BlockState) -> str:
        orig_key, value, alias, date, time, hidden = (
            token["attrs"].get("key"),
            token["attrs"].get("value"),
            token["attrs"].get("alias"),
            token["attrs"].get("date"),
            token["attrs"].get("time"),
            token["attrs"].get("hidden", False),
        )

        date_suffix = ""
        if date:
            date_suffix = date.strftime("%d-%m-%Y")
            if time:
                date_suffix = f"{time.strftime('%H:%M')} {date_suffix}"
            date_suffix = f" ({date_suffix})"

        key = self.entryclass_remap.get(orig_key, orig_key)

        if (orig_key, value) in self.entry_remap:
            remapped = self.entry_remap[(orig_key, value)]
            if remapped is None:
                return ("~" if hidden else "") + value + date_suffix
            value = remapped

        prefix = "~" if hidden else ""
        if key is None:
            return prefix + (f"{value} ({alias})" + date_suffix if alias else value + date_suffix)

        link = f"[[{key}:{value}|{alias}]]" if alias else f"[[{key}:{value}]]"
        return prefix + link + date_suffix

    def blank_line(self, token: Dict[str, Any], state: BlockState) -> str:
        return token.get("content", "")

    def footnote_ref(self, token: Dict[str, Any], state: BlockState) -> str:
        return self._render_footnote_ref(token, "")

    def img_footnote_ref(self, token: Dict[str, Any], state: BlockState) -> str:
        return self._render_footnote_ref(token, "!")

    def _render_footnote_ref(self, token: Dict[str, Any], prefix: str) -> str:
        key = token["attrs"]["key"]
        value = token["attrs"]["value"]
        return f"{prefix}[{value}][{key}]"

    def table(self, token: Dict[str, Any], state: BlockState) -> str:
        return self.render_children(token, state)

    def table_head(self, token: Dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state) + "|\n"
        for _ in range(len(token["children"])):
            text += "|---"
        text += "|\n"
        return text

    def table_body(self, token: Dict[str, Any], state: BlockState) -> str:
        return self.render_children(token, state)

    def table_row(self, token: Dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state) + "|\n"
        return text

    def table_cell(self, token: Dict[str, Any], state: BlockState) -> str:
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
        hidden = token["attrs"].get("hidden", False)
        eclass = self.entry_classes.get(key)
        if eclass is None:
            raise ValueError(f"Entry class not found: {key}")

        anonymized_value = self.anonymizer.anonymize(eclass, value)
        prefix = "~" if hidden else ""
        return f"{prefix}[[{key}:{anonymized_value}]]"


def _create_markdown(renderer: BaseMarkdownRenderer, *, hard_wrap: bool = False) -> mistune.Markdown:
    """Create mistune Markdown instance with cradle link and footnote plugins."""
    md = mistune.create_markdown(
        renderer=renderer,
        plugins=[table, cradle_link_plugin, footnote_plugin],
        hard_wrap=hard_wrap,
    )
    md.block = NewlineAwareBlockParser()
    return md


def anonymize_markdown(
    md: str,
    entry_classes: Dict[str, "EntryClass"],
    anonymizer: Anonymizer,
) -> str:
    """Create anonymized markdown by replacing cradle links with randomized values."""
    renderer = AnonymizedMarkdownRenderer(entry_classes, anonymizer)
    return _create_markdown(renderer)(md).strip()


def remap_links(
    md: str,
    entryclass_remap: Dict[str, str],
    entry_remap: Dict[Tuple[str, str], str | None],
) -> str:
    """Remap cradle links by entry class and entry; returns markdown with updated links."""
    renderer = MarkdownRenderer(entryclass_remap=entryclass_remap, entry_remap=entry_remap)
    return _create_markdown(renderer, hard_wrap=True)(md).strip()

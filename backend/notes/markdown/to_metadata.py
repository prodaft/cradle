import mistune
import frontmatter
from .common import ErrorBypassYAMLHandler, cradle_link_plugin
from .table import table
from ..models import Note
from typing import Any, Dict, Tuple, cast

from mistune.core import BlockState
from mistune.renderers.markdown import MarkdownRenderer as BaseMarkdownRenderer


class SimplifiedRenderer(BaseMarkdownRenderer):
    """A renderer for converting Markdown to markdown, with changes."""

    NAME = "markdown"

    def __init__(
        self,
        entryclass_remap: Dict[str, str] = {},
        entry_remap: Dict[Tuple[str, str], str] = {},
    ) -> None:
        self.entryclass_remap = entryclass_remap
        self.entry_remap = entry_remap
        super(SimplifiedRenderer, self).__init__()

    def paragraph(self, token: Dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state)
        return text + "\n"

    def cradle_link(self, token: Dict[str, any], state: BlockState) -> str:
        key, value, alias, date, time = (
            token["attrs"].get("key"),
            token["attrs"].get("value"),
            token["attrs"].get("alias"),
            token["attrs"].get("date"),
            token["attrs"].get("time"),
        )

        return alias or value or ""

    def blank_line(self, token: Dict[str, Any], state: BlockState) -> str:
        return token.get("content", "")

    def table(self, token: Dict[str, any], state: BlockState) -> str:
        return ""

    def table_head(self, token: Dict[str, any], state: BlockState) -> str:
        return ""

    def table_body(self, token: Dict[str, any], state: BlockState) -> str:
        return ""

    def table_row(self, token: Dict[str, any], state: BlockState) -> str:
        return ""

    def table_cell(self, token: Dict[str, any], state: BlockState) -> str:
        return ""

    def text(self, token: Dict[str, Any], state: BlockState) -> str:
        return token.get("raw", "")

    def emphasis(self, token: Dict[str, Any], state: BlockState) -> str:
        return self.render_children(token, state)

    def strong(self, token: Dict[str, Any], state: BlockState) -> str:
        return self.render_children(token, state)

    def link(self, token: Dict[str, Any], state: BlockState) -> str:
        label = cast(str, token.get("label"))
        return label

    def image(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def codespan(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def linebreak(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def softbreak(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def inline_html(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def heading(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def thematic_break(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def block_text(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def block_code(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def block_quote(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def block_html(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def block_error(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""

    def list(self, token: Dict[str, Any], state: BlockState) -> str:
        return ""


class MetadataGuesser(mistune.HTMLRenderer):
    def render_tokens(self, tokens, state):
        if len(self.expected_fields) == 0:
            return ""

        return super().render_tokens(tokens, state)

    def __init__(self):
        super().__init__()
        self.metadata = {}
        self.expected_fields = [
            "title",
            "description",
        ]

    def set_field(self, key, value):
        if key in self.metadata:
            return

        self.metadata[key] = value.strip()

        if key in self.expected_fields:
            self.expected_fields.remove(key)

    def heading(self, text, level):
        self.set_field("title", text)

        return ""

    def paragraph(self, text):
        if "description" in self.metadata:
            return ""

        renderer = SimplifiedRenderer()
        markdown = mistune.create_markdown(
            renderer=renderer, plugins=[table, cradle_link_plugin], hard_wrap=True
        )
        simplified = markdown(text)

        stripped = simplified.strip()
        self.set_field(
            "description",
            stripped[0 : min(Note.description.field.max_length, len(stripped))],
        )

        return ""


def infer_metadata(md_text: str) -> dict[str, str]:
    metadata, content = frontmatter.parse(md_text, handler=ErrorBypassYAMLHandler())
    renderer = MetadataGuesser()
    markdown = mistune.create_markdown(renderer=renderer)
    markdown(content)

    renderer.metadata.update(metadata)

    return renderer.metadata

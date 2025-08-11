from typing import Any, Dict

import frontmatter
import mistune
from mistune import BlockState

from ..models import Note
from .common import ErrorBypassYAMLHandler
from .to_markdown import MarkdownRenderer


class MetadataGuesser(MarkdownRenderer):
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

    def heading(self, token: Dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state)
        self.set_field("title", text)

        return ""

    def paragraph(self, token: Dict[str, Any], state: BlockState) -> str:
        if "description" in self.metadata:
            return ""

        text = self.render_children(token, state)

        stripped = text.strip()
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

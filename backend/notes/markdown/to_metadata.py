"""Extract title and description from markdown frontmatter and first heading/paragraph."""

from typing import Any

import frontmatter
import mistune
from mistune.core import BlockState
from mistune.renderers.markdown import MarkdownRenderer

from ..models import Note
from .utils import ErrorBypassYAMLHandler

MAX_TITLE_LENGTH = Note._meta.get_field("title").max_length
MAX_DESCRIPTION_LENGTH = Note._meta.get_field("description").max_length
_NORMALIZE_LIMITS = {"title": MAX_TITLE_LENGTH, "description": MAX_DESCRIPTION_LENGTH}


class MetadataGuesser(MarkdownRenderer):
    """Extracts title (first heading) and description (first paragraph) from markdown."""

    def __init__(self):
        super().__init__()
        self.metadata: dict[str, Any] = {}

    def set_field(self, key: str, value: str) -> None:
        """Set metadata key if not already set (first heading/paragraph wins)."""
        if key in self.metadata:
            return
        self.metadata[key] = value.strip()

    def heading(self, token: dict[str, Any], state: BlockState) -> str:
        text = self.render_children(token, state).strip()
        if text:
            self.set_field("title", text[:MAX_TITLE_LENGTH])
        return ""

    def paragraph(self, token: dict[str, Any], state: BlockState) -> str:
        if "description" in self.metadata:
            return ""
        text = self.render_children(token, state)
        stripped = text.strip()
        if stripped:
            self.set_field("description", stripped[:MAX_DESCRIPTION_LENGTH])
        return ""


def infer_metadata(md_text: str) -> tuple[int, dict[str, Any]]:
    """Extract metadata from markdown: frontmatter YAML + first heading (title), first paragraph (description)."""
    metadata, content = frontmatter.parse(md_text, handler=ErrorBypassYAMLHandler())
    renderer = MetadataGuesser()
    markdown = mistune.create_markdown(renderer=renderer)
    markdown(content)

    renderer.metadata.update(metadata)

    for key in ("title", "description"):
        if key in renderer.metadata:
            val = renderer.metadata[key]
            s = "" if val is None else str(val).strip()[: _NORMALIZE_LIMITS[key]]
            renderer.metadata[key] = s

    return len(md_text) - len(content), renderer.metadata

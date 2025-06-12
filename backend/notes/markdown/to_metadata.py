import mistune
import frontmatter
from .common import ErrorBypassYAMLHandler


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
        ]

    def set_field(self, key, value):
        self.metadata[key] = value.strip()

        if key in self.expected_fields:
            self.expected_fields.remove(key)

    def heading(self, text, level):
        if "title" not in self.metadata:
            self.set_field("title", text)

        return ""


def infer_metadata(md_text: str) -> dict[str, str]:
    metadata, content = frontmatter.parse(md_text, handler=ErrorBypassYAMLHandler())
    renderer = MetadataGuesser()
    markdown = mistune.create_markdown(renderer=renderer)
    markdown(md_text)

    renderer.metadata.update(metadata)

    return renderer.metadata

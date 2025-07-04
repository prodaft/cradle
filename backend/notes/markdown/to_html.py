import base64
from io import BytesIO
from typing import Any, Dict, Optional, Tuple, Callable
import mistune
from mistune.renderers.html import HTMLRenderer as BaseHTMLRenderer
import frontmatter
import datetime

from .common import cradle_link_plugin, footnote_plugin, ErrorBypassYAMLHandler
from .table import table


class HTMLRenderer(BaseHTMLRenderer):
    """A renderer for converting Markdown to HTML with special handling for cradle links."""

    def __init__(
        self, fetch_image: Callable[[str, str], Optional[BytesIO]], **kwargs
    ) -> None:
        self.fetch_image = fetch_image
        super().__init__(**kwargs)

    def footnote_ref(self, text, key: str, value: str, ref: str) -> str:
        return self.emphasis(key)

    def img_footnote_ref(self, text: str, key: str, value: str, ref: Any) -> str:
        bucket, path = ref

        img = self.fetch_image(bucket, path)

        if img is None:
            return ""

        b64 = base64.b64encode(img.read()).decode("utf-8")
        img_data = f"data:image/png;base64,{b64}"
        img.close()

        return f'<img src="{img_data}" title="{value}">'

    def cradle_link(
        self,
        key: str,
        value: str,
        alias: Optional[str] = None,
        date: Optional[datetime.datetime] = None,
        time: Optional[datetime.datetime] = None,
    ) -> str:
        display = alias if alias else value

        return f'<span class="entry" entry-type="{key}">{display}</span>'


def markdown_to_html(
    md: str,
    footnotes: Dict[str, Tuple[str, str]],
    fetch_image: Callable[[str, str], Optional[BytesIO]],
) -> str:
    """
    Convert markdown to HTML with special handling for cradle links and images.

    :param md: Markdown content to convert
    :param fetch_image: Function to fetch image data given bucket and path
    :return: HTML string
    """
    _, content = frontmatter.parse(md, handler=ErrorBypassYAMLHandler())

    renderer = HTMLRenderer(fetch_image)
    markdown = mistune.create_markdown(
        renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin]
    )

    state = markdown.block.state_cls()
    state.env["ref_footnotes"] = footnotes

    result, state = markdown.parse(content, state)

    return result

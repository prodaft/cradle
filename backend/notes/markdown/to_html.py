"""Convert markdown to HTML with cradle link and footnote support."""

import datetime
import html
from io import BytesIO
from typing import Any, Callable, Dict, Optional, Tuple

import frontmatter
import mistune
from mistune.plugins.table import table
from mistune.renderers.html import HTMLRenderer as BaseHTMLRenderer

from .utils import ErrorBypassYAMLHandler, cradle_link_plugin, embed_image_as_data_url, footnote_plugin


class HTMLRenderer(BaseHTMLRenderer):
    """A renderer for converting Markdown to HTML with special handling for cradle links."""

    def __init__(self, fetch_image: Callable[[str, str], Optional[BytesIO]], **kwargs) -> None:
        self.fetch_image = fetch_image
        super().__init__(**kwargs)

    def footnote_ref(self, text: str, key: str, value: str, ref: Any) -> str:
        return self.emphasis(key)

    def img_footnote_ref(self, text: str, key: str, value: str, ref: Any) -> str:
        bucket, path = ref
        img = self.fetch_image(bucket, path)
        if img is None:
            return ""
        img_data = embed_image_as_data_url(img, path)
        safe_value = html.escape(value)
        return f'<img src="{img_data}" alt="{safe_value}" title="{safe_value}">'

    def cradle_link(
        self,
        key: str,
        value: str,
        hidden: bool = False,
        alias: Optional[str] = None,
        date: Optional[datetime.datetime] = None,
        time: Optional[datetime.datetime] = None,
    ) -> str:
        display = alias if alias else value
        safe_key = html.escape(key)
        safe_display = html.escape(display)

        return f'<span class="entry" entry-type="{safe_key}">{safe_display}</span>'


def markdown_to_html(
    md: str,
    footnotes: Dict[str, Tuple[str, str]],
    fetch_image: Callable[[str, str], Optional[BytesIO]],
) -> str:
    """Convert markdown to HTML with special handling for cradle links and images.

    Args:
        md: Markdown content to convert.
        footnotes: Dict mapping footnote keys to (bucket, path) tuples.
        fetch_image: Function to fetch image data given bucket and path.

    Returns:
        HTML string.
    """
    _, content = frontmatter.parse(md, handler=ErrorBypassYAMLHandler())

    renderer = HTMLRenderer(fetch_image)
    markdown = mistune.create_markdown(renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin])

    state = markdown.block.state_cls()
    state.env["ref_footnotes"] = footnotes

    result, state = markdown.parse(content, state)

    return result

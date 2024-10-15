from collections.abc import Iterable
from typing import Any, ClassVar, Dict, List, Literal, Match, Optional, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState

from mistune.markdown import Markdown
from mistune import InlineParser, InlineState

LINK_REGEX = r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"  # noqa: E501 to avoid splitting the regex on two lines


def parse_cradle_link(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
    pos = m.end()

    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group(5),
                "value": m.group(6),
                "alias": m.group(7) if m.group(7) else None,
            },
        }
    )

    return pos


def cradle_link(md: "Markdown") -> None:
    md.inline.register("url_link", LINK_REGEX, parse_cradle_link, before="link")


class PlateJSRender(BaseRenderer):
    """A renderer for converting Markdown to HTML."""

    NAME: ClassVar[Literal["platejs"]] = "platejs"

    def __init__(
        self, entries: Dict[Tuple[str, str], Tuple[str, Optional[str]]]
    ) -> None:
        self.entries = entries
        super(PlateJSRender, self).__init__()

    def render_token(self, token: Dict[str, Any], state: BlockState) -> str:
        # backward compitable with v2
        func = self._get_method(token["type"])
        attrs = token.get("attrs")

        if "raw" in token:
            text = token["raw"]
        elif "children" in token:
            text = self.render_tokens(token["children"], state)
        else:
            if attrs:
                return func(**attrs)
            else:
                return func()

        if attrs:
            return func(text, **attrs)
        else:
            return func(text)

    def render_tokens(self, tokens: Iterable[Dict[str, Any]], state: BlockState) -> str:
        return list(self.iter_tokens(tokens, state))

    def text(self, text: List) -> Dict[str, Any]:
        return {"type": "text", "children": [{"text": text}]}

    def emphasis(self, text: List) -> Dict[str, Any]:
        return {"type": "emphasis", "children": [{"text": text}]}

    def strong(self, text: List) -> Dict[str, Any]:
        return {"type": "strong", "children": [{"bold": True, "text": text}]}

    def link(self, text: List, url: str, title: Optional[str] = None) -> Dict[str, Any]:
        return {
            "type": "link",
            "url": url,
            "title": title,
            "children": [{"text": text}],
        }

    def image(
        self, text: List, url: str, title: Optional[str] = None
    ) -> Dict[str, Any]:
        return {"type": "image", "url": url, "title": title or "", "alt": text}

    def codespan(self, text: List) -> Dict[str, Any]:
        return {"type": "code", "children": [{"text": text}]}

    def linebreak(self) -> Dict[str, Any]:
        return {"type": "br"}

    def softbreak(self) -> Dict[str, Any]:
        return {"type": "softbreak"}

    def paragraph(self, text: List) -> Dict[str, Any]:
        return {"type": "paragraph", "children": [{"text": text}]}

    def heading(self, text: List, level: int, **attrs: Any) -> Dict[str, Any]:
        return {"type": f"h{level}", "children": [{"text": text}]}

    def cradle_link(self, key: str, value: str, alias: Optional[str]) -> str:
        id, alias2 = self.entries.get((key, value))
        value = alias or alias2 or value

        return {
            "type": "mention",
            "entityType": key,
            "value": value,
            "id": id,
        }

    def blank_line(self) -> Dict[str, Any]:
        return {}

    def thematic_break(self) -> Dict[str, Any]:
        return {"type": "thematic_break"}

    def block_text(self, text: List) -> Dict[str, Any]:
        return {"type": "block_text", "children": [{"text": text}]}

    def block_code(self, code: str, info: Optional[str] = None) -> Dict[str, Any]:
        return {"type": "code_block", "info": info or "", "children": [{"text": code}]}

    def block_quote(self, text: List) -> Dict[str, Any]:
        return {"type": "blockquote", "children": [{"text": text}]}

    def block_html(self, html: str) -> Dict[str, Any]:
        return {"type": "html", "children": [{"text": html}]}

    def block_error(self, text: List) -> Dict[str, Any]:
        return {"type": "error", "children": [{"text": text}]}

    def list(self, text: List, ordered: bool, **attrs: Any) -> Dict[str, Any]:
        return {
            "type": "ordered_list" if ordered else "unordered_list",
            "children": [{"text": text}],
            **attrs,
        }

    def list_item(self, text: List) -> Dict[str, Any]:
        return {"type": "list_item", "children": [{"text": text}]}

    def table(renderer: BaseRenderer, text: List) -> str:
        return {"type": "table", "children": text}

    def table_head(renderer: BaseRenderer, text: List) -> str:
        return {"type": "thead", "children": text}

    def table_body(renderer: BaseRenderer, text: List) -> str:
        return {"type": "tbody", "children": text}

    def table_row(renderer: BaseRenderer, text: List) -> str:
        return {"type": "tr", "children": text}

    def table_cell(
        renderer: BaseRenderer,
        text: List,
        align: Optional[str] = None,
        head: bool = False,
    ) -> str:
        return {"type": "td", "children": text}


def markdown_to_pjs(
    md: str, entries: Dict[Tuple[str, str], Tuple[str, Optional[str]]]
) -> str:
    # Create a renderer instance
    renderer = PlateJSRender(entries)

    # Create a Markdown instance using the renderer
    markdown = mistune.create_markdown(
        renderer=renderer, plugins=["table", cradle_link]
    )

    # Render the sample Markdown string
    result = markdown(md)

    # Print or return the result
    return result

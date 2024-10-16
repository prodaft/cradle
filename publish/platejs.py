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
        self, entries: Dict[Tuple[str, str], Dict[str, Optional[str]]]
    ) -> None:
        self.entries = entries
        super(PlateJSRender, self).__init__()

    def render_token(self, token: Dict[str, Any], state: BlockState) -> str:
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
        results = []
        for i in self.iter_tokens(tokens, state):
            if i is None:
                continue
            elif isinstance(i, list):
                results.extend(filter(lambda x: x is not None, i))
            elif isinstance(i, dict):
                results.append(i)

        return results

    def text(self, text: List) -> Dict[str, Any]:
        return {"text": text}

    def emphasis(self, text: List) -> Dict[str, Any]:
        for i in text:
            if "text" in i:
                i["italic"] = True
            elif "children" in i:
                i["children"] = self.emphasis(i["children"])

        return text

    def strong(self, text: List) -> Dict[str, Any]:
        for i in text:
            if "text" in i:
                i["bold"] = True
            elif "children" in i:
                i["children"] = self.emphasis(i["children"])

        return text

    def link(self, text: List, url: str, title: Optional[str] = None) -> Dict[str, Any]:
        return {
            "type": "a",
            "href": url,
            "children": text,
        }

    def image(
        self, text: List, url: str, title: Optional[str] = None
    ) -> Dict[str, Any]:
        # TODO: Turn img to base64
        return {"type": "img", "url": url, "title": title or "", "alt": text}

    def codespan(self, text: List) -> Dict[str, Any]:
        return {"type": "code", "children": text}

    def linebreak(self) -> Dict[str, Any]:
        return None

    def softbreak(self) -> Dict[str, Any]:
        return None

    def paragraph(self, text: List) -> Dict[str, Any]:
        return {"type": "p", "children": text}

    def heading(self, text: List, level: int, **attrs: Any) -> Dict[str, Any]:
        return {"type": f"h{level}", "children": text}

    def cradle_link(self, key: str, value: str, alias: Optional[str]) -> str:
        d = self.entries.get((key, value), {})

        id = d.get("id")
        type = d.get("type")
        alias2 = d.get("value")

        value = alias or alias2 or value

        if id is None:
            return {"text": value, "bold": True}

        return {
            "type": "mention",
            "id": id,
            "entityType": type,
            "value": value,
            "valueType": "",
            "children": [{"text": ""}],
        }

    def blank_line(self) -> Dict[str, Any]:
        return None

    def thematic_break(self) -> Dict[str, Any]:
        return None

    def block_text(self, text: List) -> Dict[str, Any]:
        return text

    def block_code(self, code: str, info: Optional[str] = None) -> Dict[str, Any]:
        return {"type": "code_block", "lang": info or "", "children": [{"text": code}]}

    def block_quote(self, text: List) -> Dict[str, Any]:
        return {"type": "blockquote", "children": text}

    def block_html(self, html: str) -> Dict[str, Any]:
        return None

    def block_error(self, text: List) -> Dict[str, Any]:
        return {"type": "blockquote", "children": text}

    def list(self, text: List, ordered: bool, **attrs: Any) -> Dict[str, Any]:
        depth = attrs.get("depth", 0)
        items = []

        i = 0
        for c in text:
            c = c.get("children", {"text": ""})

            children = []
            sublists = []

            i += 1

            for child in c:
                if "listStyleType" in child:
                    sublists.append(child)
                    child["listStart"] += i
                    i += 1
                else:
                    children.append(child)

            item = {
                "children": children if children else [{"text": ""}],
                "indent": depth + 1,
                "listStart": i - len(sublists),
                "listStyleType": "decimal" if ordered else "disc",
                "type": "p",
            }
            items.append(item)

            if sublists:
                items.extend(sublists)

        return items

    def list_item(self, text: List) -> Dict[str, Any]:
        return {"type": "p", "children": text}

    def table(self, text: List) -> str:
        return {"type": "table", "children": text}

    def table_head(self, text: List) -> str:
        return self.table_row(text)

    def table_body(self, text: List) -> str:
        return text

    def table_row(self, text: List) -> str:
        return {"type": "tr", "children": text}

    def table_cell(
        self,
        text: List,
        align: Optional[str] = None,
        head: bool = False,
    ) -> str:
        return {"type": "td", "children": text}


def markdown_to_pjs(
    md: str, entries: Dict[Tuple[str, str], Dict[str, Optional[str]]]
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

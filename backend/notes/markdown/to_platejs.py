import base64
from collections.abc import Callable, Iterable
from io import BytesIO
from typing import Any, Dict, List, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState
import frontmatter
import datetime


from .common import cradle_link_plugin, footnote_plugin, ErrorBypassYAMLHandler
from .table import table


class PlateJSRenderer(BaseRenderer):
    """A renderer for converting Markdown to PlateJS format."""

    NAME = "platejs"

    def __init__(
        self,
        entries: Dict[Tuple[str, str], Dict[str, Optional[str]]],
    ) -> None:
        self.entries = entries
        self.mentions: Set[Tuple[str, str]] = set()
        super(PlateJSRenderer, self).__init__()

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

    def render_tokens(
        self, tokens: Iterable[Dict[str, Any]], state: BlockState
    ) -> List[Dict[str, Any]]:
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

    def emphasis(self, text: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for i in text:
            if "text" in i:
                i["italic"] = True
            elif "children" in i:
                i["children"] = self.emphasis(i["children"])

        return text

    def strong(self, text: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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
        return {"type": "img", "url": url, "title": title or "", "alt": text}

    def codespan(self, text: List) -> Dict[str, Any]:
        return {"text": text, "italic": True}

    def linebreak(self) -> None:
        return None

    def softbreak(self) -> None:
        return None

    def paragraph(self, text: List) -> Dict[str, Any]:
        return {"type": "p", "children": text}

    def heading(self, text: List, level: int, **attrs: Any) -> Dict[str, Any]:
        return {"type": f"h{min(3, level)}", "children": text}

    def cradle_link(
        self,
        key: str,
        value: str,
        alias: Optional[str],
        date: Optional[datetime.datetime],
        time: Optional[datetime.datetime],
    ) -> Dict[str, Any]:
        d = self.entries.get((key, value), {})

        id = d.get("id")
        type = d.get("type")
        alias2 = d.get("value")

        if alias is None:
            if alias2 and value.lower().strip() != alias2.lower().strip():
                value = f"{value} - {alias2}"
            else:
                value = alias2 or value
        else:
            value = alias

        if id is None:
            return {"text": value}

        if (id, type) in self.mentions:
            return {"text": value}

        self.mentions.add((id, type))

        return {
            "type": "mention",
            "id": id,
            "entityType": type,
            "value": value,
            "valueType": "",
            "children": [{"text": ""}],
        }

    def footnote_ref(self, key: str, value: str) -> Dict[str, Any]:
        return {"type": "p", "children": [{"text": value}]}

    def img_footnote_ref(
        self, text: str, key: str, value: str, ref: Any
    ) -> Dict[str, Any]:
        return {
            "type": "footnote_img_ref",
            "caption": [{"text": value}],
            "key": key,
            "children": [{"text": ""}],
        }

    def blank_line(self) -> None:
        return None

    def thematic_break(self) -> None:
        return None

    def block_text(self, text: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return text

    def block_code(self, code: str, info: Optional[str] = None) -> Dict[str, Any]:
        return {"type": "code_block", "lang": info or "", "children": [{"text": code}]}

    def block_quote(self, text: List) -> Dict[str, Any]:
        return {"type": "blockquote", "children": text}

    def block_html(self, html: str) -> None:
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

    def table(self, text: List) -> Dict[str, Any]:
        return {"type": "table", "children": text}

    def table_head(self, text: List) -> Dict[str, Any]:
        return self.table_row(text)

    def table_body(self, text: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return text

    def table_row(self, text: List) -> Dict[str, Any]:
        return {"type": "tr", "children": text}

    def table_cell(
        self,
        text: List,
        align: Optional[str] = None,
        head: bool = False,
    ) -> Dict[str, Any]:
        return {"type": "td", "children": text}

    def inline_html(self, html: str) -> None:
        return None


def resolve_footnote_imgs(
    pjs: List, fetch_image: Callable[[str, str], Optional[BytesIO]], state: BlockState
) -> None:
    ref_footnotes = state.env["ref_footnotes"]

    for i in pjs:
        if "type" not in i:
            continue

        if i["type"] == "footnote_img_ref":
            i["type"] = "img"

            bucket, path = ref_footnotes[i["key"]]
            i.pop("key")

            img = fetch_image(bucket, path)

            if img is None:
                i["type"] = "p"
                i["children"] = i.pop("caption")

                continue

            b64 = base64.b64encode(img.read()).decode("utf-8")

            i["url"] = f"data:image/png;base64,{b64}"
            img.close()

        elif "children" in i:
            resolve_footnote_imgs(i["children"], fetch_image, state)


def markdown_to_pjs(
    md: str,
    entries: Dict[Tuple[str, str], Dict[str, Optional[str]]],
    footnotes: Dict[str, str],
    fetch_image: Callable[[str, str], Optional[BytesIO]],
) -> str:
    _, content = frontmatter.parse(md, handler=ErrorBypassYAMLHandler())

    renderer = PlateJSRenderer(entries)

    markdown = mistune.create_markdown(
        renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin]
    )

    state = markdown.block.state_cls()
    state.env["ref_footnotes"] = footnotes

    result, state = markdown.parse(content, state)

    resolve_footnote_imgs(result, fetch_image, state)

    return result

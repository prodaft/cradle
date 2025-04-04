from collections.abc import Iterable
from typing import Any, Dict, List, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState

import itertools

from .common import cradle_link_plugin, footnote_plugin
from .table import table


def flatten(arr: List) -> List:
    nl = []

    for i in arr:
        if isinstance(i, list):
            nl.extend(flatten(i))
        else:
            nl.append(i)

    return nl


class Link:
    def __init__(
        self,
        key: str,
        value: str,
        alias: str | None = None,
    ) -> None:
        self.key = key
        self.value = value
        self.alias = alias

    def __eq__(self, value: object, /) -> bool:
        if not isinstance(value, Link):
            return False
        return self.key == value.key and self.value == value.value

    def __hash__(self) -> int:
        return hash((self.key, self.value))

    def __repr__(self) -> str:
        if self.alias:
            return f"[[{self.key}:{self.value}|{self.alias}]]"
        return f"[[{self.key}:{self.value}]]"


class LinkTreeNode:
    def __init__(
        self,
        parents: List["Link"] = [],
        children: List["LinkTreeNode"] = [],
        type: str | None = None,
        level: int = 0,
    ) -> None:
        self.children = children or list()
        self.parents = parents or list()
        self.type = type
        self.level = level

    def links(self) -> List[Link]:
        links = [p for p in self.parents]
        links.extend(flatten([i.links() for i in self.children]))
        return links

    def dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "level": self.level,
            "parents": [i.__dict__ for i in self.parents],
            "children": [i.dict() for i in self.children],
        }

    def _relation_pairs(
        self,
    ) -> Tuple[int, Iterable[Link], Iterable[Tuple[Link, Link]]]:
        children: set[Link] = set()
        pairs: Set[Tuple[Link, Link]] = set()
        parents = set(self.parents)
        d0_children: Set[Link] = set()

        if self.children:
            for i in self.children:
                d, foo, bar = i._relation_pairs()
                children.update(foo)

                if d == 0:
                    d0_children.update(foo)

                pairs.update(bar)

        pairs.update({(x, y) for (x, y) in itertools.permutations(parents, 2)})
        pairs.update(
            {(x, y) for (x, y) in itertools.product(d0_children, d0_children) if x != y}
        )
        pairs.update(
            {(x, y) for (x, y) in itertools.product(parents, children) if x != y}
        )
        pairs.update(
            {(x, y) for (x, y) in itertools.product(children, parents) if x != y}
        )

        if not parents:
            return 1, d0_children, pairs

        return 0, parents, pairs

    def relation_pairs(self) -> Iterable[Tuple[Link, Link]]:
        _, parents, pairs = self._relation_pairs()
        return pairs


class LinksRenderer(BaseRenderer):
    """A renderer for converting Markdown to HTML."""

    NAME = "cradle"

    def __init__(
        self,
    ) -> None:
        super(LinksRenderer, self).__init__()

    def render_token(self, token: Dict[str, Any], state: BlockState) -> Link:
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
    ) -> List[LinkTreeNode]:
        results: List[LinkTreeNode] = []

        for i in self.iter_tokens(tokens, state):
            if isinstance(i, list):
                results.extend(filter(lambda x: x is not None, i))
            elif isinstance(i, LinkTreeNode):
                results.append(i)

        return results

    def text(self, children: List) -> List[LinkTreeNode]:
        return children

    def emphasis(self, children: List) -> List[LinkTreeNode]:
        return children

    def strong(self, children: List) -> List[LinkTreeNode]:
        return children

    def link(
        self, children: List, url: str, title: Optional[str] = None
    ) -> List[LinkTreeNode]:
        return children

    def image(
        self, children: List, url: str, title: Optional[str] = None
    ) -> List[LinkTreeNode]:
        return children

    def codespan(self, children: List) -> List[LinkTreeNode]:
        return children

    def linebreak(self) -> None:
        return None

    def softbreak(self) -> None:
        return None

    def paragraph(self, children: List) -> LinkTreeNode | None:
        if len(children) == 0:
            return None

        return LinkTreeNode(parents=[], children=children, type="p")

    def heading(self, children: List, level: int, **attrs: Any) -> LinkTreeNode:
        return LinkTreeNode(
            parents=flatten([x.links() for x in children]), type="heading", level=level
        )

    def cradle_link(self, key: str, value: str, alias: Optional[str]) -> LinkTreeNode:
        return LinkTreeNode(parents=[Link(key, value, alias)], type="cradle")

    def footnote_ref(self, value: str) -> LinkTreeNode:
        return LinkTreeNode(type="footnote")

    def img_footnote_ref(self, text: str, value: str, key: str) -> LinkTreeNode:
        return LinkTreeNode(type="img_footnote")

    def blank_line(self) -> None:
        return None

    def thematic_break(self) -> None:
        return None

    def block_text(self, children: List) -> LinkTreeNode | None:
        if len(children) == 1:
            return children[0]

        if len(children) == 0:
            return None

        return LinkTreeNode(children=children, type="block")

    def block_code(self, code: str, info: Optional[str] = None) -> None:
        return None

    def block_quote(self, children: List) -> LinkTreeNode:
        return LinkTreeNode(children=children, type="quote")

    def block_html(self, html: str) -> None:
        return None

    def block_error(self, children: List) -> LinkTreeNode:
        return LinkTreeNode(children=children, type="error")

    def list(self, children: List, ordered: bool, **attrs: Any) -> LinkTreeNode:
        last_c = None

        for c in children:
            if last_c is None:
                last_c = c
                continue

            if c.type == "list":
                c.parents = last_c.links()

            last_c = c

        return LinkTreeNode(children=children, type="list")

    def list_item(self, children: List) -> List:
        return children

    def table(self, children: List) -> List:
        return children

    def table_head(self, children: List) -> List:
        return children

    def table_body(self, children: List) -> List:
        return children

    def table_row(self, children: List) -> LinkTreeNode:
        return LinkTreeNode(children=children, type="tr")

    def table_cell(
        self,
        children: List,
        align: Optional[str] = None,
        head: bool = False,
    ) -> List:
        return children

    def inline_html(self, html: str) -> None:
        return None


def heading_hierarchy(children: List[LinkTreeNode]) -> LinkTreeNode:
    root = LinkTreeNode(children=[])
    levels = [root]

    current_heading = root

    for i in children:
        if i.type == "heading":
            levels.extend([levels[-1]] * max(0, i.level - len(levels) + 1))
            levels[i.level - 1].children.append(i)
            current_heading = i
            levels[i.level] = i
        else:
            current_heading.children.append(i)

    return root


def cradle_connections(
    md: str,
) -> List[LinkTreeNode]:
    # Create a renderer instance
    renderer = LinksRenderer()

    # Create a Markdown instance using the renderer
    markdown = mistune.create_markdown(
        renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin]
    )

    # Render the sample Markdown string
    result, state = markdown.parse(md)

    # Print or return the result
    return result

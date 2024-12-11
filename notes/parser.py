import json
from collections.abc import Iterable
from typing import Any, ClassVar, Dict, List, Literal, Match, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState

from mistune.markdown import Markdown
import itertools
from mistune import InlineParser, InlineState

LINK_REGEX = r"\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"  # noqa: E501 to avoid splitting the regex on two lines


def parse_cradle_link(
    inline: "InlineParser", m: Match[str], state: "InlineState"
) -> int:
    pos = m.end()

    state.append_token(
        {
            "type": "cradle_link",
            "attrs": {
                "key": m.group("cl_type"),
                "value": m.group("cl_value"),
                "alias": m.group("cl_alias"),
            },
        }
    )

    return pos


def cradle_link(md: "Markdown") -> None:
    md.inline.register("url_link", LINK_REGEX, parse_cradle_link, before="link")


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

    def _relation_pairs(self) -> Tuple[int, List[Link], Set[Tuple[Link, Link]]]:
        children = set()
        pairs = set()
        parents = set(self.parents)
        d0_children = set()

        if self.children:
            for i in self.children:
                d, foo, bar = i._relation_pairs()
                children.update(foo)

                if d == 0:
                    d0_children.update(foo)

                pairs.update(bar)

        pairs.update({(x, y) for (x, y) in itertools.permutations(parents, 2)})
        pairs.update({(x, y) for (x, y) in itertools.product(d0_children, d0_children)})
        pairs.update({(x, y) for (x, y) in itertools.product(parents, children)})
        pairs.update({(x, y) for (x, y) in itertools.product(children, parents)})

        if not parents:
            return 1, d0_children, pairs

        return 0, parents, pairs

    def relation_pairs(self) -> Set[Tuple[Link, Link]]:
        _, parents, pairs = self._relation_pairs()
        return pairs


class ProcessCradleLinks(BaseRenderer):
    """A renderer for converting Markdown to HTML."""

    NAME: ClassVar[Literal["cradle"]] = "cradle"

    def __init__(
        self,
    ) -> None:
        super(ProcessCradleLinks, self).__init__()

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
    ) -> List[Link]:
        results = []

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

    def paragraph(self, children: List) -> LinkTreeNode:
        if len(children) == 0:
            return None

        return LinkTreeNode(parents=[], children=children, type="p")

    def heading(self, children: List, level: int, **attrs: Any) -> LinkTreeNode:
        return LinkTreeNode(
            parents=flatten([x.links() for x in children]), type="heading", level=level
        )

    def cradle_link(self, key: str, value: str, alias: Optional[str]) -> LinkTreeNode:
        return LinkTreeNode(parents=[Link(key, value, alias)], type="cradle")

    def blank_line(self) -> Dict[str, Any]:
        return None

    def thematic_break(self) -> Dict[str, Any]:
        return None

    def block_text(self, children: List) -> LinkTreeNode:
        if len(children) == 1:
            return children[0]

        if len(children) == 0:
            return None

        return LinkTreeNode(children=children, type="block")

    def block_code(self, code: str, info: Optional[str] = None) -> None:
        return None

    def block_quote(self, children: List) -> LinkTreeNode:
        return LinkTreeNode(children=children, type="quote")

    def block_html(self, html: str) -> Dict[str, Any]:
        return None

    def block_error(self, children: List) -> Dict[str, Any]:
        return LinkTreeNode(children=children, type="error")

    def list(self, children: List, ordered: bool, **attrs: Any) -> Dict[str, Any]:
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

    def inline_html(self, html: str) -> str:
        return None


def heading_hierarchy(children: List[LinkTreeNode]) -> List[LinkTreeNode]:
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
) -> str:
    # Create a renderer instance
    renderer = ProcessCradleLinks()

    # Create a Markdown instance using the renderer
    markdown = mistune.create_markdown(
        renderer=renderer, plugins=["table", cradle_link]
    )

    # Render the sample Markdown string
    result, state = markdown.parse(md)

    # Print or return the result
    return result


if __name__ == "__main__":
    entries = {
        ("user", "1"): {"id": "1", "type": "user", "value": "John Doe"},
        ("note", "1"): {"id": "1", "type": "note", "value": "Note 1"},
    }
    with open("test.md") as f:
        md = f.read()

    foo = cradle_connections(md)
    tree = heading_hierarchy(foo)

    print(json.dumps(tree.dict(), indent=4))
    pairs = tree.relation_pairs()
    a = set()
    for i in pairs:
        if (i[1], i[0]) in a:
            continue

        a.add(i)
        print(f"{i[0]}, {i[1]}")

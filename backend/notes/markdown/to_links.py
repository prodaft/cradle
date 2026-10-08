import datetime
import enum
import hashlib
from collections.abc import Iterable
from typing import Any, Optional

import frontmatter
import mistune
from mistune.core import BaseRenderer, BlockState
from mistune.plugins.table import table

from .utils import ErrorBypassYAMLHandler, cradle_link_plugin, footnote_plugin, parse_entry_date


class NodeType(enum.Enum):
    """Node type in the markdown AST (heading, paragraph, list, etc.)."""

    ROOT = "<root>"
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    BLOCK = "block"
    LIST = "list"
    LIST_ITEM = "list_item"
    TABLE = "table"
    TABLE_ROW = "table_row"
    TABLE_CELL = "table_cell"
    BLOCKQUOTE = "blockquote"
    CRADLELINK = "link"
    OTHER = "other"


class Link:
    """A cradle link: type:value with optional alias and date."""

    def __init__(
        self,
        key: str,
        value: str,
        date: datetime.datetime | None = None,
        alias: str | None = None,
        virtual: bool = False,
    ) -> None:
        self.key = key
        self.value = value
        self.alias = alias
        self.virtual = virtual
        self.date = date

    def __eq__(self, other: object, /) -> bool:
        if not isinstance(other, Link):
            return False
        return self.key == other.key and self.value == other.value

    def __hash__(self) -> int:
        return hash((self.key, self.value))

    def __repr__(self) -> str:
        if self.alias:
            return f"[[{self.key}:{self.value}|{self.alias}]]"
        return f"[[{self.key}:{self.value}]]"


class NodeFactory:
    """Factory for creating Node objects with deterministic IDs based on a base ID."""

    def __init__(self, base_id: str = ""):
        self.base_id = base_id

    def create_node(
        self,
        parent: Optional["Node"] = None,
        children: Optional[list["Node"]] = None,
        links: Optional[set["Link"]] = None,
        type: Optional["NodeType"] = None,
        level: int = 0,
    ) -> "Node":
        """Create a new Node with the factory's base_id."""
        return Node(
            parent=parent,
            children=children,
            links=links,
            type=type,
            level=level,
            base_id=self.base_id,
        )


class Node:
    """AST node for markdown structure; holds links and children."""

    def __init__(
        self,
        parent: Optional["Node"] = None,
        children: Optional[list["Node"]] = None,
        links: Optional[set["Link"]] = None,
        type: Optional["NodeType"] = None,
        level: int = 0,
        base_id: str = "",
    ) -> None:
        self.parent = parent
        self.children = children if children is not None else []
        self.links = links if links is not None else set()
        self.type = type
        self.level = level
        self.base_id = base_id
        # Track the path to this node (will be populated when building the tree)
        self._path_index = -1

    def add_child(self, child: "Node") -> None:
        """Adds a child node and sets its parent to self (only one parent allowed)."""
        if child not in self.children:
            # Set the path index for the child based on its position
            child._path_index = len(self.children)
            # Ensure child inherits the base_id
            child.base_id = self.base_id
            self.children.append(child)
        if child.parent is not self:
            child.parent = self

        if child.level == -1:
            child.level = self.level

    def get_path(self) -> str:
        """Get a deterministic path string representing this node's position in the tree."""
        if self.parent is None:
            return "root"

        path = []
        current = self
        while current.parent is not None:
            path.append(str(current._path_index))
            current = current.parent

        return "-".join(reversed(path))

    def merge_children(self) -> None:
        """Merge this node with its children.

        Absorbs children's links, promotes grandchildren to direct children,
        removes original children.
        """
        if not self.children:
            return  # Nothing to merge

        # Collect all items we need to merge
        child_links = set()
        grandchildren = []

        # Gather all links and grandchildren from each child
        for child in self.children:
            # Add all links from the child
            child_links.update(child.links)

            # Process each grandchild
            for grandchild in child.children:
                # Update parent reference to point to self
                grandchild.parent = self
                grandchildren.append(grandchild)

        # Add all collected links to self
        self.links.update(child_links)

        # Replace children with grandchildren
        self.children = grandchildren

        # Update path indices for the new children
        for i, child in enumerate(self.children):
            child._path_index = i

    def combine_with_virtual_children(self) -> None:
        if not self.children or self.links:
            return

        children = self.children
        self.children = []

        for i in children:
            if i.links:
                self.children.append(i)

            for grandchild in i.children:
                grandchild.parent = self
                self.children.append(grandchild)

    def get_deterministic_id(self) -> str:
        """Generate a deterministic ID based on the base_id and node's path in the tree."""
        path = self.get_path()
        node_type = self.type.value if self.type else "none"

        # Combine base_id with path, node type and level to ensure uniqueness
        id_str = f"{path}-{node_type}-{self.level}"

        # Use a hash function to create a fixed-length ID
        return f"{self.base_id}-" + hashlib.md5(id_str.encode()).hexdigest()[:16]

    def get_effective_links(self, ignore_connectors: bool = False) -> set[Link]:
        if self.links:
            return self.links
        elif not ignore_connectors:
            # Use deterministic ID instead of random UUID
            note_link = Link(key="note", value=self.get_deterministic_id(), virtual=True)
            return {note_link}

        return set()

    def all_links(self, ignore_connectors: bool = False) -> set[Link]:
        """Returns all links in the node and its children."""
        all_links = set(self.get_effective_links(ignore_connectors))

        for child in self.children:
            all_links.update(child.all_links(ignore_connectors))

        return all_links

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Node):
            return NotImplemented
        return (
            self.level == other.level
            and self.type == other.type
            and self.parent == other.parent
            and self.links == other.links
        )

    def __str__(self) -> str:
        return (
            f"Node(type={self.type}, level={self.level}, "
            f"parent={'set' if self.parent else 'none'}, children={len(self.children)}, links={len(self.links)})"
        )

    def __repr__(self) -> str:
        return (
            f"Node(type={self.type!r}, level={self.level}, "
            f"parent={self.parent!r}, children={self.children!r}, links={self.links!r})"
        )


class LinksRenderer(BaseRenderer):
    """A renderer for converting Markdown tokens to a Node tree."""

    NAME = "cradle"

    def __init__(
        self,
        base_id: str = "",
        root_links: Optional[set[Link]] = None,
    ) -> None:
        super().__init__()
        self.node_factory = NodeFactory(base_id)
        self.root_links = root_links if root_links is not None else set()

    def traverse_up(self, src: Node, target: Node) -> Node:
        """Traverse upwards in the link tree from src to find a semantic parent.

        For headings: traverse until level can parent target; insert dummy if needed.
        Similar logic for lists.
        """
        if target.type == NodeType.HEADING:
            if src.type != NodeType.HEADING and src.type != NodeType.ROOT:
                return self.traverse_up(src.parent, target)

            if (src.type == NodeType.HEADING and target.level > src.level + 1) or (
                src.type == NodeType.ROOT and target.level > 1
            ):
                dummy = self.node_factory.create_node(type=NodeType.HEADING, level=src.level + 1)
                src.add_child(dummy)
                return self.traverse_up(dummy, target)
            elif src.type == NodeType.HEADING and target.level <= src.level:
                return self.traverse_up(src.parent, target)
            else:
                return src

        if target.type == NodeType.PARAGRAPH:
            if src.type not in (
                NodeType.HEADING,
                NodeType.LIST_ITEM,
                NodeType.LIST,
                NodeType.ROOT,
            ):
                return self.traverse_up(src.parent, target)
            else:
                return src

        if target.type == NodeType.LIST_ITEM:
            if src.type not in (
                NodeType.HEADING,
                NodeType.LIST,
                NodeType.ROOT,
            ):
                return self.traverse_up(src.parent, target)
            else:
                return src

        if target.type == NodeType.TABLE_CELL:
            if src.type not in (
                NodeType.TABLE,
                NodeType.TABLE_ROW,
                NodeType.HEADING,
                NodeType.ROOT,
            ):
                return self.traverse_up(src.parent, target)
            else:
                return src

        if target.type == NodeType.TABLE_ROW:
            if src.type not in (
                NodeType.TABLE,
                NodeType.HEADING,
                NodeType.ROOT,
            ):
                return self.traverse_up(src.parent, target)
            else:
                return src

        if target.type == NodeType.TABLE:
            if src.type not in (
                NodeType.HEADING,
                NodeType.LIST,
                NodeType.ROOT,
            ):
                return self.traverse_up(src.parent, target)
            else:
                return src

        return src

    def render_token(self, token: dict[str, Any], state: BlockState, parent: Node) -> Node:
        func = self._get_method(token["type"])
        attrs = token.get("attrs", {})

        node = func(**attrs)

        if node is None:
            node = parent
        else:
            parent = self.traverse_up(parent, node)
            parent.add_child(node)

        if token.get("children"):
            self.render_tokens(token["children"], state, node)

        return node

    def render_tokens(self, tokens: Iterable[dict[str, Any]], state: BlockState, parent: Node) -> None:
        for tok in tokens:
            parent = self.render_token(tok, state, parent)

    def __call__(self, tokens: Iterable[dict[str, Any]], state: BlockState) -> Node:
        root = self.node_factory.create_node(type=NodeType.ROOT, level=0, links=self.root_links)
        self.render_tokens(tokens, state, root)
        return root

    def heading(self, level: int) -> Node:
        return self.node_factory.create_node(type=NodeType.HEADING, level=level)

    def text(self) -> Node:
        return self.node_factory.create_node(type=NodeType.PARAGRAPH)

    def emphasis(self) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def strong(self) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def link(self, url: str, title: Optional[str] = None) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def image(self, url: str, title: Optional[str] = None) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def codespan(self) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def linebreak(self) -> None:
        return None

    def softbreak(self) -> None:
        return None

    def paragraph(self) -> Node | None:
        return self.node_factory.create_node(type=NodeType.PARAGRAPH)

    def cradle_link(
        self,
        key: str,
        value: str,
        hidden: bool,
        alias: Optional[str],
        date: Optional[datetime.datetime],
        time: Optional[datetime.datetime],
    ) -> Node | None:
        if hidden:
            return None

        if date and time:
            date = date.replace(hour=time.hour, minute=time.minute)

        link = Link(key=key, value=value, alias=alias, date=date)
        node = self.node_factory.create_node(type=NodeType.CRADLELINK)
        node.links.add(link)
        return node

    def footnote_ref(self, value: str) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def img_footnote_ref(self, text: str, value: str, key: str) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def blank_line(self) -> None:
        return None

    def thematic_break(self) -> None:
        return None

    def block_text(self) -> Node | None:
        return self.node_factory.create_node(type=NodeType.BLOCK)

    def block_code(self, info: Optional[str] = None) -> None:
        return None

    def block_quote(self) -> Node:
        return self.node_factory.create_node(type=NodeType.BLOCKQUOTE)

    def block_html(self) -> None:
        return None

    def block_error(self) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def list(self, ordered: bool, **attrs: Any) -> Node:
        return self.node_factory.create_node(type=NodeType.LIST, level=attrs.get("depth", 0) + 1)

    def list_item(self) -> Node:
        return self.node_factory.create_node(type=NodeType.LIST_ITEM, level=-1)

    def table(self) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE)

    def table_head(self) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE_ROW)

    def table_body(self) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE_ROW)

    def table_row(self) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE_ROW)

    def table_cell(self, align: Optional[str] = None, head: bool = False) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE_CELL)

    def inline_html(self, *args, **kwargs) -> None:
        return None


def cradle_connections(
    md: str,
    base_id: str = "",
) -> Node:
    """Parse markdown into a Node tree with cradle links and frontmatter entries."""
    metadata, content = frontmatter.parse(md, handler=ErrorBypassYAMLHandler())
    root_entries = metadata.pop("entries", {})

    if not isinstance(root_entries, dict):
        root_entries = {}

    entries = set()

    for subtype, value in root_entries.items():
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    entries.add(Link(key=subtype, value=item))
                else:
                    raise ValueError("Each list item must be an entry name.")
        elif isinstance(value, dict):
            for k, v in value.items():
                if isinstance(v, str):
                    date = parse_entry_date(v)
                    entries.add(Link(key=subtype, value=k, date=date))
                else:
                    raise ValueError("Each date must be given as text.")

        elif isinstance(value, str):
            entries.add(Link(key=subtype, value=value))
        else:
            raise ValueError("Use a single entry name, a list of names, or names paired with dates.")

    renderer = LinksRenderer(base_id=base_id, root_links=entries)

    markdown = mistune.create_markdown(renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin])

    result, state = markdown.parse(content)

    return result


def compress_tree(node: "Node", max_clique_size: int) -> bool:
    """Merge children when total links <= max_clique_size; remove empty nodes. Returns True if node has content."""
    nonempty_children = []

    count = 0
    for i in node.children:
        if compress_tree(i, max_clique_size):
            nonempty_children.append(i)
            count += len(i.links)

    node.children = nonempty_children

    if node.children and len(node.links) + count <= max_clique_size:
        node.merge_children()
    elif len(node.children) == 1 and not node.links:
        node.merge_children()

    node.combine_with_virtual_children()

    return len(node.children) + len(node.links) > 0

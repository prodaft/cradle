from collections.abc import Iterable
import enum
from typing import Any, Dict, List, Optional, Set, Tuple
import mistune
from mistune.core import BaseRenderer, BlockState
import uuid
import hashlib

import itertools

if __name__ == "__main__":
    from common import cradle_link_plugin, footnote_plugin
    from table import table
else:
    from .common import cradle_link_plugin, footnote_plugin
    from .table import table


class NodeType(enum.Enum):
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
    def __init__(
        self,
        key: str,
        value: str,
        alias: str | None = None,
        virtual: bool = False,
    ) -> None:
        self.key = key
        self.value = value
        self.alias = alias
        self.virtual = virtual

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


class NodeFactory:
    """Factory for creating Node objects with deterministic IDs based on a base ID."""

    def __init__(self, base_id: str = ""):
        self.base_id = base_id

    def create_node(
        self,
        parent: Optional["Node"] = None,
        children: Optional[List["Node"]] = None,
        links: Optional[Set["Link"]] = None,
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
    def __init__(
        self,
        parent: Optional["Node"] = None,
        children: Optional[List["Node"]] = None,
        links: Optional[Set["Link"]] = None,
        type: Optional["NodeType"] = None,
        level: int = 0,
        base_id: str = "",
    ) -> None:
        self.parent = parent
        self.children = children if children is not None else []
        self.links = links if links is not None else set()
        self.type = type
        self.level = level
        self.uid = uuid.uuid4().hex
        self.base_id = base_id
        # Track the path to this node (will be populated when building the tree)
        self._path_index = -1

    def dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.kind if self.type else None,
            "level": self.level,
            "parent": id(self.parent) if self.parent else None,
            "children": [c.dict() for c in self.children],
            "links": [repr(link) for link in self.links],
        }

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
        """
        Merges this node with its children by:
        1. Absorbing all children's links
        2. Moving all grandchildren to be direct children
        3. Removing the original children
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
        if not self.children or len(self.links) > 0:
            return

        children = self.children
        self.children = []

        for i in children:
            if len(i.links) > 0:
                self.children.append(i)

            for grandchild in i.children:
                grandchild.parent = self
                self.children.append(grandchild)

    def get_deterministic_id(self) -> str:
        """Generate a deterministic ID based on the base_id and node's path in the tree."""
        path = self.get_path()
        node_type = str(self.type.value) if self.type else "none"

        # Combine base_id with path, node type and level to ensure uniqueness
        id_str = f"{path}-{node_type}-{self.level}"

        # Use a hash function to create a fixed-length ID
        return f"{self.base_id}-" + hashlib.md5(id_str.encode()).hexdigest()[:16]

    def get_effective_links(self, ignore_connectors: bool = False) -> Set[Any]:
        if self.links:
            return self.links
        elif not ignore_connectors:
            # Use deterministic ID instead of random UUID
            virtual_link = Link(
                key="virtual", value=self.get_deterministic_id(), virtual=True
            )
            return {virtual_link}

        return set()

    def get_relation_tuples(self) -> List[Tuple[Link, Link]]:
        node_links = self.get_effective_links()
        result = set()

        for link_pair in itertools.combinations(node_links, 2):
            result.add(link_pair)

        for child in self.children:
            child_links = child.get_effective_links()

            for node_link in node_links:
                for child_link in child_links:
                    if node_link != child_link:
                        result.add((node_link, child_link))

            result = result.union(child.get_relation_tuples())

        return result

    def all_links(self, ignore_connectors: bool = False) -> Set[Link]:
        """Returns all links in the node and its children."""
        all_links = self.get_effective_links(ignore_connectors)

        for child in self.children:
            all_links.update(child.all_links(ignore_connectors))

        return all_links

    def __eq__(self, other: object) -> bool:
        if other is None:
            return False
        if not isinstance(other, Node):
            raise NotImplementedError(
                "Cannot compare Node with non-Node object: " + str(other)
            )
        return (
            self.level == other.level
            and self.type == other.type
            and self.parent == other.parent
            and set(self.children) == set(other.children)
            and self.links == other.links
        )

    def __hash__(self) -> int:
        return hash(
            (
                self.level,
                self.type,
                id(self.parent) if self.parent else None,
                tuple(sorted(id(c) for c in self.children)),
                frozenset(self.links),
            )
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
    """A renderer for converting Markdown to HTML."""

    NAME = "cradle"

    def __init__(
        self,
        base_id: str = "",
    ) -> None:
        super(LinksRenderer, self).__init__()
        self.node_factory = NodeFactory(base_id)

    def traverse_up(self, src: Node, target: Node):
        """
        This function traverses upwards in the link tree starting from src, until it finds
        a node that is on a level that can semantically parent the node
        - target: level 2 heading. Should keep traversing until it reaches a heading of
          level 1. If it reaches root, first, insert a dummy node of level 1 heading
        - Similar logic with lists
        """
        if target.type == NodeType.HEADING:
            if src.type != NodeType.HEADING and src.type != NodeType.ROOT:
                return self.traverse_up(src.parent, target)

            if (src.type == NodeType.HEADING and target.level > src.level + 1) or (
                src.type == NodeType.ROOT and target.level > 1
            ):
                dummy = self.node_factory.create_node(
                    type=NodeType.HEADING, level=src.level + 1
                )
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

        return src

    def render_token(
        self, token: Dict[str, Any], state: BlockState, parent: Node
    ) -> Node:
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

    def render_tokens(
        self, tokens: Iterable[Dict[str, Any]], state: BlockState, parent: Node
    ) -> Node:
        for tok in tokens:
            parent = self.render_token(tok, state, parent)

    def __call__(self, tokens: Iterable[Dict[str, Any]], state: BlockState) -> str:
        root = self.node_factory.create_node(type=NodeType.ROOT, level=0)
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

    def cradle_link(self, key: str, value: str, alias: Optional[str]) -> Node:
        link = Link(key=key, value=value, alias=alias)
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

    def block_html(self, html: str) -> None:
        return None

    def block_error(self) -> Node:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def list(self, ordered: bool, **attrs: Any) -> Node:
        return self.node_factory.create_node(
            type=NodeType.LIST, level=attrs.get("depth", 0) + 1
        )

    def list_item(self) -> List:
        return self.node_factory.create_node(type=NodeType.LIST_ITEM, level=-1)

    def table(self) -> List:
        return self.node_factory.create_node(type=NodeType.TABLE)

    def table_head(self) -> List:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def table_body(self) -> List:
        return self.node_factory.create_node(type=NodeType.OTHER)

    def table_row(self) -> Node:
        return self.node_factory.create_node(type=NodeType.TABLE_ROW)

    def table_cell(self, align: Optional[str] = None, head: bool = False) -> List:
        return self.node_factory.create_node(type=NodeType.TABLE_CELL)

    def inline_html(self, html: str) -> None:
        return None


def cradle_connections(
    md: str,
    base_id: str = "",
) -> Node:
    # Create a renderer instance with the provided base_id
    renderer = LinksRenderer(base_id=base_id)

    # Create a Markdown instance using the renderer
    markdown = mistune.create_markdown(
        renderer=renderer, plugins=[table, cradle_link_plugin, footnote_plugin]
    )

    # Render the sample Markdown string
    result, state = markdown.parse(md)

    # Print or return the result
    return result


def print_tree(
    node: "Node", indent: str = "", is_last: bool = True, show_details: bool = False
) -> None:
    """
    Print a Node object as a tree structure.

    Args:
        node: The Node object to print
        indent: Current indentation string
        is_last: Whether this node is the last child of its parent
        show_details: Whether to show additional node details (links, etc.)
    """
    # Handle the case when node is None
    if node is None:
        return

    # Branch symbols
    branch = "└── " if is_last else "├── "

    # Print the current node
    type_str = str(node.type) if node.type else "None"
    node_str = f"{type_str} (level={node.level})"

    if show_details:
        details = []
        if node.links:
            details.append(", ".join(map(repr, node.links)))
        if show_details:
            details.append(f"id={node.get_deterministic_id()}")

        if details:
            node_str += f" | {' | '.join(details)}"

    print(f"{indent}{branch}{node_str}")

    # Prepare indentation for children
    child_indent = indent + ("    " if is_last else "│   ")

    # Print children
    for i, child in enumerate(node.children):
        is_last_child = i == len(node.children) - 1
        print_tree(child, child_indent, is_last_child, show_details)


def compress_tree(node: "Node", max_clique_size: int) -> bool:
    nonempty_children = []

    count = 0
    for i in node.children:
        if compress_tree(i, max_clique_size):
            nonempty_children.append(i)
            count += len(i.links)

    node.children = nonempty_children

    if len(node.children) > 0 and len(node.links) + count <= max_clique_size:
        node.merge_children()
    elif len(node.children) == 1 and len(node.links) == 0:
        node.merge_children()

    node.combine_with_virtual_children()

    return len(node.children) + len(node.links) > 0


if __name__ == "__main__":
    with open("example_note.md", "r") as f:
        md = f.read()

    # Now you can specify a base_id when creating the tree
    node = cradle_connections(md, base_id="document123")
    print_tree(node, show_details=True)
    compress_tree(node, 3)
    print_tree(node, show_details=True)
    print(node.get_relation_tuples())

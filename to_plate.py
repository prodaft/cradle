import markdown_it
from markdown_it.token import Token
import json
import uuid


# Helper function to generate unique ids
def generate_id():
    return str(uuid.uuid4())[:6]


# Function to convert markdown tokens to PlateJS-compatible JSON
def tokens_to_platejs(tokens):
    json_blocks = []

    for token in tokens:
        if token.type == "heading_open":
            level = int(token.tag[1])  # Get the heading level (e.g., h1 -> 1)
            json_blocks.append(
                {
                    "id": generate_id(),
                    "type": f"h{level}",
                    "children": [{"text": token.map}],
                }
            )

        elif token.type == "paragraph_open":
            json_blocks.append({"id": generate_id(), "type": "p", "children": []})

        elif token.type == "inline" and json_blocks:
            if json_blocks[-1]["type"] == "p" or json_blocks[-1]["type"].startswith(
                "h"
            ):
                json_blocks[-1]["children"].append({"text": token.content})

        elif token.type == "bullet_list_open":
            json_blocks.append({"id": generate_id(), "type": "ul", "children": []})

        elif token.type == "ordered_list_open":
            json_blocks.append({"id": generate_id(), "type": "ol", "children": []})

        elif token.type == "list_item_open":
            if json_blocks[-1]["type"] in ["ul", "ol"]:
                json_blocks[-1]["children"].append(
                    {"id": generate_id(), "type": "li", "children": []}
                )

        elif token.type == "inline" and json_blocks[-1]["type"] == "li":
            json_blocks[-1]["children"][-1]["children"].append({"text": token.content})

        elif token.type == "link_open":
            href = dict(token.attrs).get("href", "")
            json_blocks[-1]["children"].append(
                {"id": generate_id(), "type": "a", "href": href, "children": []}
            )

        elif token.type == "image":
            attrs = dict(token.attrs)
            src = attrs.get("src", "")
            alt = attrs.get("alt", "")
            json_blocks.append(
                {
                    "id": generate_id(),
                    "type": "img",
                    "src": src,
                    "alt": alt,
                    "children": [],
                }
            )

        elif token.type == "table_open":
            json_blocks.append({"id": generate_id(), "type": "table", "children": []})

        elif token.type == "tr_open":
            if json_blocks[-1]["type"] == "table":
                json_blocks[-1]["children"].append(
                    {"id": generate_id(), "type": "tr", "children": []}
                )

        elif token.type == "td_open" or token.type == "th_open":
            if (
                json_blocks[-1]["children"]
                and json_blocks[-1]["children"][-1]["type"] == "tr"
            ):
                json_blocks[-1]["children"][-1]["children"].append(
                    {"id": generate_id(), "type": "td", "children": []}
                )

        elif token.type == "inline" and json_blocks[-1]["type"] == "table":
            last_row = json_blocks[-1]["children"][-1]
            if last_row["children"]:
                last_row["children"][-1]["children"].append({"text": token.content})

        elif token.type == "code_block" or token.type == "fence":
            # Extract the language from the token info (if provided)
            language = token.info.strip() if token.info else None
            code_block = {
                "id": generate_id(),
                "type": "code_block",
                "children": [{"text": token.content}],
            }
            if language:
                code_block["language"] = language  # Add language if present
            json_blocks.append(code_block)
            return json_blocks


# Function to convert markdown to PlateJS-compatible JSON
def markdown_to_platejs_json(markdown_text):
    md = markdown_it.MarkdownIt()
    tokens = md.parse(markdown_text)
    json_blocks = tokens_to_platejs(tokens)
    return json.dumps(json_blocks, indent=2)


# Example Markdown input with a table, list, image, and code block
markdown_text = """
# Heading 1
This is a paragraph with a [link](https://example.com).

## Heading 2
- First list item
- Second list item

1. First ordered item
2. Second ordered item

![Alt text](https://example.com/image.png)

| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Row 1    |
| Row 2    | Row 2    |

```py
This is a code block
```
"""

# Convert Markdown to PlateJS-compatible JSON
platejs_json = markdown_to_platejs_json(markdown_text)

# Print the JSON result
print(platejs_json)

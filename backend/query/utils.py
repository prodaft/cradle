"""Advanced query string parsing for subtype:name format with wildcards.

Parses query strings like "subtype:name" where both parts support:
- Unquoted: * as wildcard (istartswith, iendswith, icontains, or iregex)
- Quoted (double-quotes): literal match, backslash escapes
"""

import re

from django.db.models import Q


def parse_field(s: str, start: int) -> tuple[str, int, bool]:
    r"""Parse one field from s starting at index start.

    If the field is quoted (starts with \"), reads until the matching unescaped quote.
    Backslash escapes the next character inside quotes.

    Returns:
        Tuple of (field_value, next_index, was_quoted).
    """
    n = len(s)
    if start < n and s[start] == '"':
        # Field is quoted: skip the opening quote.
        i = start + 1
        field_chars = []
        while i < n:
            if s[i] == "\\":
                # Next character is escaped.
                if i + 1 < n:
                    field_chars.append(s[i + 1])
                    i += 2
                else:
                    i += 1  # stray backslash, move on
            elif s[i] == '"':
                # Closing quote found.
                i += 1
                break
            else:
                field_chars.append(s[i])
                i += 1
        return "".join(field_chars), i, True
    else:
        # Unquoted field: read until colon (or end of string).
        i = start
        while i < n and s[i] != ":":
            i += 1
        return s[start:i].strip(), i, False


def process_pattern(field: str, was_quoted: bool) -> tuple[str | None, str | None]:
    """Map field value to Django ORM lookup and processed value.

    Quoted fields: exact match (wildcards literal).
    Unquoted: * at extremes → istartswith/iendswith/icontains; else → iregex.
    Lone '*' returns (None, None).
    """
    if was_quoted:
        return "exact", field

    if "*" not in field:
        return "exact", field

    left = field.startswith("*")
    right = field.endswith("*")
    count = field.count("*")

    # Handle simple cases where wildcards are only at the extremes.
    if count == 1:
        if left and not right:
            return "iendswith", field[1:]
        elif right and not left:
            return "istartswith", field[:-1]
        elif right and left:
            return None, None
    if count == 2 and left and right and field.find("*", 1, len(field) - 1) == -1:
        return "icontains", field[1:-1]

    # Otherwise, handle wildcards in the middle or multiple wildcards.
    escaped = re.escape(field).replace(r"\*", ".*")
    regex_pattern = "^" + escaped + "$"
    return "iregex", regex_pattern


def parse_query(query_str: str) -> Q:
    """Parse query string into a Django Q object for Entry filtering.

    Format: subtype:name (both support wildcards when unquoted).
    If no colon outside quotes: treats whole string as name and also searches
    entity descriptions (case-insensitive).

    Raises:
        ValueError: Invalid format (e.g. missing colon after first field).
    """
    # First, scan for a colon that is not inside quotes.
    colon_index = None
    in_quote = False
    i = 0

    while i < len(query_str):
        if query_str[i] == '"' and (i == 0 or query_str[i - 1] != "\\"):
            in_quote = not in_quote
        elif query_str[i] == ":" and not in_quote:
            colon_index = i
            break
        i += 1

    if colon_index is None:
        # No colon: treat entire string as name; also search description for entities
        field2, _, quoted2 = parse_field(query_str, 0)
        lookup2, pattern2 = process_pattern(field2, quoted2)
        name_q = Q(**{f"name__{lookup2}": pattern2}) if lookup2 else ~Q(pk__in=[])
        entity_description_q = Q(description__icontains=query_str.strip("*")) & Q(entry_class__type="entity")
        q = name_q | entity_description_q
    else:
        # Colon found: parse normally
        field1, i, quoted1 = parse_field(query_str, 0)
        if i >= len(query_str) or query_str[i] != ":":
            raise ValueError("Invalid query format: Missing colon separator")
        i += 1  # Skip the colon
        field2, i, quoted2 = parse_field(query_str, i)

        # Process the fields for wildcards
        lookup1, pattern1 = process_pattern(field1, quoted1)
        lookup2, pattern2 = process_pattern(field2, quoted2)

        if lookup1 and lookup2:
            q = Q(**{f"entry_class__subtype__{lookup1}": pattern1}) & Q(**{f"name__{lookup2}": pattern2})
        elif lookup1:
            q = Q(**{f"entry_class__subtype__{lookup1}": pattern1})
        elif lookup2:
            q = Q(**{f"name__{lookup2}": pattern2})
        else:
            q = ~Q(pk__in=[])  # Match all (both fields were lone '*')

    return q

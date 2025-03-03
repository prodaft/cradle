import re
from django.db.models import Q


def parse_field(s, start):
    """
    Parse one field from s starting at index 'start'.
    If the field is quoted (starts with a double quote), it reads until the matching unescaped quote.
    Returns a tuple (field_value, next_index, was_quoted).
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


def process_pattern(field, was_quoted):
    """
    Given a field value and whether it was quoted, return a tuple of (lookup, processed_value)
    for the Django query.

    For quoted fields, wildcards are taken literally (using an exact lookup).

    For unquoted fields:
      - If no '*' is present, return an exact match.
      - If '*' appears only at the extremes in a simple pattern, use:
          - "istartswith" if the field ends with '*'
          - "iendswith" if it starts with '*'
          - "icontains" if it both starts and ends with '*' (and no other '*' exists)
      - If '*' appears in the middle or there are multiple wildcards beyond these simple cases,
        convert the field into a regex pattern (escaping regex-special characters, except '*')
        and return an "iregex" lookup.
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
    def escape_except_asterisk(s):
        escaped = ""
        for char in s:
            if char in ".^$+?{}[]|()\\":
                escaped += "\\" + char
            else:
                escaped += char
        return escaped

    escaped_field = escape_except_asterisk(field)
    regex_pattern = "^" + escaped_field.replace("*", ".*") + "$"
    return "iregex", regex_pattern


def parse_query(query_str):
    """
    Parses a query string which is expected to be in the form:
      <subtype>:<name>
    However, if no colon is found outside of any quotes, the input is treated as a literal for the name field,
    and the subtype is set to '*' (i.e. processed as *:<literal>).

    Returns a Django Q object that filters on:
      - entry_class__subtype__<lookup> for the subtype field,
      - name__<lookup> for the name field.
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
        # No colon found: treat the entire string as the name field.
        # Use "*" as the subtype.
        field1 = "*"
        quoted1 = False
        field2, _, quoted2 = parse_field(query_str, 0)
    else:
        # Colon found: parse normally.
        field1, i, quoted1 = parse_field(query_str, 0)
        if i >= len(query_str) or query_str[i] != ":":
            raise ValueError("Invalid query format: Missing colon separator")
        i += 1  # Skip the colon.
        field2, i, quoted2 = parse_field(query_str, i)

    # Process the fields for wildcards.
    lookup1, pattern1 = process_pattern(field1, quoted1)
    lookup2, pattern2 = process_pattern(field2, quoted2)

    if lookup1 and lookup2:
        q = Q(**{f"entry_class__subtype__{lookup1}": pattern1}) & Q(
            **{f"name__{lookup2}": pattern2}
        )
    elif lookup1:
        q = Q(**{f"entry_class__subtype__{lookup1}": pattern1})
    elif lookup2:
        q = Q(**{f"name__{lookup2}": pattern2})
    else:
        q = ~Q(pk__in=[])  # Empty

    return q


# Example test cases:
if __name__ == "__main__":
    examples = [
        # Standard usage with a colon.
        ("blog:django", ("exact", "blog"), ("exact", "django")),
        # With wildcards at extremes.
        ("*blog:django*", ("iendswith", "blog"), ("istartswith", "django")),
        # Wildcards in the middle (handled as regex).
        ("blo*g:dan*ger", ("iregex", r"^blo.*g$"), ("iregex", r"^dan.*ger$")),
        # Quoted fields (wildcards literal).
        ('"*blog*":django', ("exact", "*blog*"), ("exact", "django")),
        # Literal input without colon: becomes *:<literal>
        ("django", ("iregex", r"^.*$"), ("exact", "django")),
        # Quoted literal without colon.
        ('"django:framework"', (), ("exact", "django:framework")),
        # Quoted literal without colon.
        ('"django framework"', (), ("exact", "django framework")),
    ]

    for input_str, expected_subtype, expected_name in examples:
        q = parse_query(input_str)
        print(f"Input: {input_str}")
        print(
            f"Expected subtype lookup: {expected_subtype}, Expected name lookup: {expected_name}"
        )
        print(f"Q object: {q}\n")

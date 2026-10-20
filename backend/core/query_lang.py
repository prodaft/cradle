r"""Boolean/wildcard mini query-language for free-text ``search`` filters.

Input is parsed into an AST of our own (:func:`parse`) and compiled into a Django ``Q``
(:func:`to_q`) -- user text only ever becomes the *value* of a lookup, never part of a regex
or SQL fragment unescaped, so there's no injection surface beyond what a plain ``icontains``
already had.

Semantics (over plain database columns, matched case-insensitively)::

    admin          -> field contains "admin"
    "admin ci"     -> field contains "admin ci"
    admin*         -> field starts with "admin"
    *admin         -> field ends with "admin"
    *admin*        -> field contains "admin"
    adm*n          -> field matches adm.*n (whole field)
    =admin         -> field equals "admin"
    ="admin ci"    -> field equals "admin ci"

A leaf matches when *any* of the caller's search fields matches; ``-``/``NOT`` excludes rows
where any field matches.

Grammar::

    query    := or_expr
    or_expr  := and_expr (OR and_expr)*
    and_expr := not_expr (AND? not_expr)*        # bare adjacency = implicit AND
    not_expr := (NOT | '-') simple_atom | atom
    atom     := '(' or_expr ')' | simple_atom
    simple_atom := exact | phrase | wildcard_term | term
    exact    := '=' (phrase | term)              # no wildcards after '='
    phrase   := '"' ( [^"\\] | '\\' . )* '"'     # non-empty
    term     := run of chars excluding whitespace, ()", and the AND/OR/NOT keywords
    wildcard_term := a bare token containing '*', with at least MIN_WILDCARD_LITERAL_CHARS
                     non-'*' characters

``NOT``/``-`` only ever negates a single term/phrase/wildcard/exact, never a parenthesized
group. A query made only of negations is allowed: ``-spam`` is a perfectly good database
filter.

Qualifiers (``status:active``, ``created:>2024-01-01``, ``sort:-name``) are extracted by the UI
into the endpoint's own structured filter params before ``search`` is sent, so this module only
handles the free-text remainder.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import assert_never

from django.db.models import Q
from rest_framework.exceptions import ValidationError

MIN_WILDCARD_LITERAL_CHARS = 2
MAX_QUERY_LENGTH = 512
MAX_TOKENS = 128


class QueryLangError(ValueError):
    """A query string that doesn't parse."""


# ---------------------------------------------------------------------------
# AST
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Term:
    text: str


@dataclass(frozen=True, slots=True)
class Phrase:
    text: str


@dataclass(frozen=True, slots=True)
class Exact:
    """Whole-field equality."""

    text: str


@dataclass(frozen=True, slots=True)
class Wildcard:
    text: str


@dataclass(frozen=True, slots=True)
class Not:
    operand: Term | Phrase | Exact | Wildcard


@dataclass(frozen=True, slots=True)
class And:
    left: Node
    right: Node


@dataclass(frozen=True, slots=True)
class Or:
    left: Node
    right: Node


Node = Term | Phrase | Exact | Wildcard | Not | And | Or

# ---------------------------------------------------------------------------
# Lexer
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class _Token:
    kind: str
    text: str


_TOKEN_RE = re.compile(
    r'"(?P<phrase>(?:[^"\\]|\\.)*)"'
    r"|(?P<lparen>\()"
    r"|(?P<rparen>\))"
    r"|(?P<equals>=)"
    r"|(?P<minus>-(?=\S))"
    r'|(?P<word>[^\s()"]+)'
)
_UNESCAPE_RE = re.compile(r"\\(.)")
_KEYWORDS = frozenset({"AND", "OR", "NOT"})


def _tokenize(raw: str) -> list[_Token]:
    tokens: list[_Token] = []
    pos = 0
    for match in _TOKEN_RE.finditer(raw):
        gap = raw[pos : match.start()].strip()
        if gap:
            raise QueryLangError(f"Couldn't parse {gap!r} in query.")
        pos = match.end()
        kind = match.lastgroup
        if kind == "phrase":
            tokens.append(_Token("PHRASE", _UNESCAPE_RE.sub(r"\1", match.group("phrase"))))
        elif kind == "lparen":
            tokens.append(_Token("LPAREN", "("))
        elif kind == "rparen":
            tokens.append(_Token("RPAREN", ")"))
        elif kind == "equals":
            tokens.append(_Token("EQUALS", "="))
        elif kind == "minus":
            tokens.append(_Token("MINUS", "-"))
        else:
            word = match.group("word")
            tokens.append(_Token(word.upper(), word) if word.upper() in _KEYWORDS else _Token("WORD", word))
    tail = raw[pos:].strip()
    if tail:
        raise QueryLangError(f"Couldn't parse {tail!r} in query.")
    if len(tokens) > MAX_TOKENS:
        raise QueryLangError(f"Query has too many terms (max {MAX_TOKENS}).")
    return tokens


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------


class _Parser:
    """Recursive-descent parser over a flat token list; one pass, no backtracking needed."""

    def __init__(self, tokens: list[_Token]) -> None:
        self._tokens = tokens
        self._pos = 0

    def _peek(self) -> _Token | None:
        return self._tokens[self._pos] if self._pos < len(self._tokens) else None

    def _advance(self) -> _Token:
        token = self._tokens[self._pos]
        self._pos += 1
        return token

    def parse(self) -> Node:
        if not self._tokens:
            raise QueryLangError("Query is empty.")
        node = self._or_expr()
        remaining = self._peek()
        if remaining is not None:
            raise QueryLangError(f"Unexpected {remaining.text!r} in query.")
        return node

    def _or_expr(self) -> Node:
        left = self._and_expr()
        while (token := self._peek()) is not None and token.kind == "OR":
            self._advance()
            left = Or(left, self._and_expr())
        return left

    def _and_expr(self) -> Node:
        left = self._not_expr()
        while True:
            token = self._peek()
            if token is None or token.kind in ("OR", "RPAREN"):
                return left
            if token.kind == "AND":
                self._advance()
            left = And(left, self._not_expr())

    def _not_expr(self) -> Node:
        token = self._peek()
        if token is not None and token.kind in ("NOT", "MINUS"):
            self._advance()
            return Not(self._simple_atom())
        return self._atom()

    def _atom(self) -> Node:
        token = self._peek()
        if token is not None and token.kind == "LPAREN":
            self._advance()
            inner = self._or_expr()
            closing = self._peek()
            if closing is None or closing.kind != "RPAREN":
                raise QueryLangError("Missing closing ')' in query.")
            self._advance()
            return inner
        return self._simple_atom()

    def _simple_atom(self) -> Term | Phrase | Exact | Wildcard:
        token = self._peek()
        if token is None:
            raise QueryLangError("Query ended where a term or phrase was expected.")
        if token.kind == "LPAREN":
            raise QueryLangError("NOT/'-' can only negate a single term or phrase, not a group in parentheses.")
        if token.kind == "EQUALS":
            self._advance()
            return self._exact_operand()
        if token.kind == "PHRASE":
            self._advance()
            if token.text == "":
                raise QueryLangError("Quoted phrase can't be empty.")
            return Phrase(token.text)
        if token.kind == "WORD":
            self._advance()
            if "*" in token.text:
                literal_chars = token.text.replace("*", "")
                if len(literal_chars) < MIN_WILDCARD_LITERAL_CHARS:
                    raise QueryLangError(
                        f"Wildcard term {token.text!r} needs at least {MIN_WILDCARD_LITERAL_CHARS} non-'*' characters."
                    )
                return Wildcard(token.text)
            return Term(token.text)
        raise QueryLangError(f"Unexpected {token.text!r} in query.")

    def _exact_operand(self) -> Exact:
        """Parse the operand of ``=``: a phrase or a non-wildcard term."""
        token = self._peek()
        if token is None:
            raise QueryLangError("Query ended where an exact term or phrase was expected after '='.")
        if token.kind == "PHRASE":
            self._advance()
            if token.text == "":
                raise QueryLangError("Exact match can't be an empty quoted phrase.")
            return Exact(token.text)
        if token.kind == "WORD":
            if "*" in token.text:
                raise QueryLangError(
                    "Exact match ('=') can't be combined with wildcards ('*'). "
                    'Use =admin or ="admin ci" for a whole-field match, or admin* / *admin* for a pattern.'
                )
            self._advance()
            return Exact(token.text)
        raise QueryLangError(f"Expected a term or phrase after '=', got {token.text!r}.")


def parse(raw: str) -> Node:
    """Parse *raw* free-text query syntax into an AST.

    Raises :class:`QueryLangError` on any malformed input: unbalanced parens/quotes, dangling
    operators, empty groups, NOT negating a group, a too-short wildcard, or a bad ``=`` operand.
    """
    if len(raw) > MAX_QUERY_LENGTH:
        raise QueryLangError(f"Query is too long (max {MAX_QUERY_LENGTH} characters).")
    return _Parser(_tokenize(raw)).parse()


# ---------------------------------------------------------------------------
# Compile to Django Q
# ---------------------------------------------------------------------------


def _wildcard_regex(pattern: str) -> str:
    """Translate a query-lang wildcard token (``*`` only) into a whole-field regex."""
    return "^" + ".*".join(re.escape(part) for part in pattern.split("*")) + "$"


def _leaf_q(node: Term | Phrase | Exact | Wildcard, fields: Sequence[str]) -> Q:
    if isinstance(node, (Term, Phrase)):
        lookup, value = "icontains", node.text
    elif isinstance(node, Exact):
        lookup, value = "iexact", node.text
    elif isinstance(node, Wildcard):
        lookup, value = "iregex", _wildcard_regex(node.text)
    else:
        assert_never(node)
    q = Q()
    for field in fields:
        q |= Q(**{f"{field}__{lookup}": value})
    return q


def _compile(node: Node, fields: Sequence[str]) -> Q:
    if isinstance(node, (Term, Phrase, Exact, Wildcard)):
        return _leaf_q(node, fields)
    if isinstance(node, Not):
        return ~_leaf_q(node.operand, fields)
    if isinstance(node, And):
        return _compile(node.left, fields) & _compile(node.right, fields)
    if isinstance(node, Or):
        return _compile(node.left, fields) | _compile(node.right, fields)
    assert_never(node)


def to_q(node: Node, fields: Sequence[str]) -> Q:
    """Compile *node* into a ``Q`` matching rows where the expression holds over *fields*."""
    if not fields:
        raise ValueError("to_q() needs at least one field to search.")
    return _compile(node, fields)


# ---------------------------------------------------------------------------
# Evaluate against plain strings (for lists that aren't querysets)
# ---------------------------------------------------------------------------


def _leaf_matches(node: Term | Phrase | Exact | Wildcard, value: str) -> bool:
    if isinstance(node, (Term, Phrase)):
        return node.text.casefold() in value
    if isinstance(node, Exact):
        return node.text.casefold() == value
    if isinstance(node, Wildcard):
        return re.fullmatch(_wildcard_regex(node.text.casefold()), value, re.DOTALL) is not None
    assert_never(node)


def _matches(node: Node, values: Sequence[str]) -> bool:
    if isinstance(node, (Term, Phrase, Exact, Wildcard)):
        return any(_leaf_matches(node, value) for value in values)
    if isinstance(node, Not):
        return not _matches(node.operand, values)
    if isinstance(node, And):
        return _matches(node.left, values) and _matches(node.right, values)
    if isinstance(node, Or):
        return _matches(node.left, values) or _matches(node.right, values)
    assert_never(node)


def matches_text(node: Node, values: Sequence[str | None]) -> bool:
    """Evaluate *node* against plain strings with the same semantics as :func:`to_q`."""
    return _matches(node, [value.casefold() for value in values if value is not None])


def parse_search(raw: str | None, *, param: str = "search") -> Node | None:
    """:func:`parse` for a request param: ``None`` for blank input, DRF 400 on a syntax error.

    *param* is the request parameter the error is reported under.
    """
    if raw is None or not raw.strip():
        return None
    try:
        return parse(raw)
    except QueryLangError as exc:
        raise ValidationError({param: [str(exc)]}) from exc


def search_q(raw: str | None, fields: Sequence[str], *, param: str = "search") -> Q | None:
    """Parse *raw* and compile it over *fields*; ``None`` for blank input.

    Raises DRF's :class:`ValidationError` (HTTP 400, keyed on *param*) on a syntax error, so a
    django-filter ``method=`` can call this directly.
    """
    node = parse_search(raw, param=param)
    return None if node is None else to_q(node, fields)

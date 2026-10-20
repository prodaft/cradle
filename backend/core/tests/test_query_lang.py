"""Tests for the free-text search query language."""

import pytest
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from core.query_lang import (
    And,
    Exact,
    Not,
    Or,
    Phrase,
    QueryLangError,
    Term,
    Wildcard,
    matches_text,
    parse,
    search_q,
    to_q,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("admin", Term("admin")),
        ('"admin ci"', Phrase("admin ci")),
        ("=admin", Exact("admin")),
        ('="admin ci"', Exact("admin ci")),
        ("admin*", Wildcard("admin*")),
        ("*.pdf", Wildcard("*.pdf")),
        ("a b", And(Term("a"), Term("b"))),
        ("a AND b", And(Term("a"), Term("b"))),
        ("a OR b c", Or(Term("a"), And(Term("b"), Term("c")))),
        ("(a OR b) c", And(Or(Term("a"), Term("b")), Term("c"))),
        ("a -b", And(Term("a"), Not(Term("b")))),
        ("a NOT b", And(Term("a"), Not(Term("b")))),
        ("-spam", Not(Term("spam"))),
        (r'"say \"hi\""', Phrase('say "hi"')),
        ("a-b", Term("a-b")),
    ],
)
def test_parse(raw, expected):
    """Each syntax form parses into the expected AST."""
    assert parse(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "a AND",
        "OR a",
        "(a",
        "a)",
        '"unterminated',
        '""',
        "-(a OR b)",
        "*a",
        "=adm*",
        "=",
        "x" * 600,
    ],
)
def test_parse_errors(raw):
    """Malformed queries raise QueryLangError."""
    with pytest.raises(QueryLangError):
        parse(raw)


def test_keywords_case_insensitive():
    """AND/OR/NOT are recognized in any case."""
    assert parse("a or b") == Or(Term("a"), Term("b"))


def test_to_q_term_ors_fields():
    """A leaf matches if any search field matches."""
    assert to_q(Term("x"), ["a", "b"]) == Q() | Q(a__icontains="x") | Q(b__icontains="x")


def test_to_q_not_and_wildcard():
    """Negation and wildcards compile to ~Q and an anchored iregex."""
    q = to_q(And(Wildcard("ad*n.pdf"), Not(Exact("y"))), ["a"])
    assert q == (Q() | Q(a__iregex=r"^ad.*n\.pdf$")) & ~(Q() | Q(a__iexact="y"))


def test_search_q_blank_and_invalid():
    """Blank input yields None; syntax errors become a DRF 400."""
    assert search_q(None, ["a"]) is None
    assert search_q("   ", ["a"]) is None
    with pytest.raises(ValidationError) as exc_info:
        search_q("a AND", ["a"], param="title")
    assert "title" in exc_info.value.detail


@pytest.mark.parametrize(
    ("raw", "values", "expected"),
    [
        ("rust", ["VirusTotal", None], True),
        ("=virustotal", ["VirusTotal"], True),
        ("=virus", ["VirusTotal"], False),
        ("virus*", ["VirusTotal"], True),
        ("*total", ["VirusTotal"], True),
        ("*.pdf", ["a.pdf.exe"], False),
        ("shodan OR virus", ["VirusTotal"], True),
        ("virus -total", ["VirusTotal"], False),
        ('"virus total"', ["virus total"], True),
    ],
)
def test_matches_text(raw, values, expected):
    """Plain-string evaluation mirrors the Q semantics."""
    node = parse(raw)
    assert matches_text(node, values) is expected


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("alice", {"alice.smith", "Alice-Admin"}),
        ("ALICE", {"alice.smith", "Alice-Admin"}),
        ('"e.s"', {"alice.smith"}),
        ("=alice-admin", {"Alice-Admin"}),
        ("alice*", {"alice.smith", "Alice-Admin"}),
        ("*.smith", {"alice.smith"}),
        ("a*n", {"Alice-Admin"}),
        ("*+x*", {"bob+x"}),
        ("alice -admin", {"alice.smith"}),
        ("smith OR bob*", {"alice.smith", "bob+x"}),
        ("-alice", {"bob+x"}),
    ],
)
def test_search_q_on_database(raw, expected):
    """Compiled queries behave as documented on the real database (regex escaping included)."""
    from user.models import CradleUser

    for i, name in enumerate(["alice.smith", "Alice-Admin", "bob+x"]):
        CradleUser.objects.create_user(username=name, password="pass", email=f"{i}@example.com")
    found = CradleUser.objects.filter(search_q(raw, ["username"]))
    assert set(found.values_list("username", flat=True)) == expected


@pytest.mark.django_db
def test_search_q_negation_keeps_null_fields():
    """Excluding a term keeps rows whose other searched field is NULL."""
    from user.models import CradleUser

    CradleUser.objects.create_user(username="carol", password="pass", email="c@example.com")
    found = CradleUser.objects.filter(search_q("-zzz", ["username", "email_confirmation_token"]))
    assert list(found.values_list("username", flat=True)) == ["carol"]

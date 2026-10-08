"""Database side of live note editing: loading a note and saving the shared document."""

from dataclasses import dataclass
from types import SimpleNamespace
from typing import Literal
from uuid import UUID

from django.db import transaction
from rest_framework.exceptions import APIException

from user.models import CradleUser

from ..models import Note


@dataclass
class NoteAccess:
    content: str
    content_hash: str
    can_read: bool
    can_write: bool


def load_note(note_id: UUID, user: CradleUser) -> NoteAccess | None:
    """The note's content and what ``user`` may do with it, or None if it does not exist."""
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        return None
    return NoteAccess(
        content=note.content,
        content_hash=note.content_hash,
        can_read=note.has_read_access(user),
        can_write=note.has_write_access(user),
    )


def current_access(note_id: UUID, user_id: UUID | str) -> NoteAccess | None:
    """Re-check what an already connected user may do; None if they are no longer active."""
    user = CradleUser.objects.filter(id=user_id, is_active=True).first()
    return load_note(note_id, user) if user else None


def read_note_content(note_id: UUID) -> tuple[str, str] | None:
    """The stored content and its hash, or None if the note does not exist."""
    note = Note.objects.filter(id=note_id).first()
    return (note.content, note.content_hash) if note else None


@dataclass
class PersistResult:
    status: Literal["saved", "conflict", "error"]
    content_hash: str = ""
    message: str = ""


def persist_document(note_id: UUID, doc: str, base_hash: str, user_id: UUID | str, force: bool) -> PersistResult:
    """Save the live document as ``user_id``'s edit.

    Refuses (``conflict``) when the stored note no longer matches ``base_hash``, i.e. it
    was changed outside the live session, unless ``force`` is set.
    """
    from ..serializers import NoteEditSerializer

    try:
        with transaction.atomic():
            note = Note.objects.select_for_update().filter(id=note_id).first()
            if note is None:
                return PersistResult("error", message="This note no longer exists.")
            if note.content == doc:
                return PersistResult("saved", content_hash=note.content_hash)
            if not force and note.content_hash != base_hash:
                return PersistResult("conflict", message="This note was changed outside the live session.")

            user = CradleUser.objects.filter(id=user_id, is_active=True).first()
            if user is None or not note.has_write_access(user):
                return PersistResult("error", message="You no longer have permission to edit this note.")

            serializer = NoteEditSerializer(
                note, data={"content": doc}, context={"request": SimpleNamespace(user=user)}
            )
            serializer.is_valid(raise_exception=True)
            note = serializer.save()
            return PersistResult("saved", content_hash=note.content_hash)
    except APIException as exc:
        return PersistResult("error", message=_detail_text(exc.detail))


def _detail_text(detail) -> str:
    if isinstance(detail, dict):
        return " ".join(_detail_text(v) for v in detail.values())
    if isinstance(detail, list):
        return " ".join(_detail_text(v) for v in detail)
    return str(detail)

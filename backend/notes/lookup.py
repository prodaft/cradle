"""Look up a note or note file by the id in a URL, as seen by the requesting user."""

from uuid import UUID

from file_transfer.exceptions import FileReferenceNotFoundException
from file_transfer.models import FileReference
from user.models import CradleUser

from .exceptions import NoteNotFoundException
from .models import Note


def get_readable_note(user: CradleUser, note_id: UUID) -> Note:
    """Return the note if ``user`` may read it.

    Missing and unreadable notes both raise NoteNotFoundException. Checks the access-vector
    queryset first, then ``has_read_access`` (the vector is recomputed asynchronously and may
    lag behind access changes).
    """
    try:
        return Note.objects.get_accessible_notes(user).get(id=note_id)
    except Note.DoesNotExist:
        pass
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        raise NoteNotFoundException(detail="That note could not be found.") from None
    if not note.has_read_access(user):
        raise NoteNotFoundException(detail="That note could not be found.")
    return note


def get_readable_file(user: CradleUser, file_id: UUID) -> tuple[FileReference, Note]:
    """Return the file and its note if ``user`` may read the note.

    Missing and unreadable files both raise FileReferenceNotFoundException.
    """
    file = FileReference.objects.select_related("note").filter(id=file_id, note__isnull=False).first()
    if file is None or not file.has_access(user):
        raise FileReferenceNotFoundException(detail="That file could not be found.")
    return file, file.note

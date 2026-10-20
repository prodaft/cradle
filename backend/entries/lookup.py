"""Look up an entry by the id in a URL, as seen by the requesting user."""

from user.models import CradleUser

from .exceptions import EntityNotFoundException, EntryNotFoundException
from .models import Entry


def get_readable_entry(user: CradleUser, entry_id: int) -> Entry:
    """Return the entry if ``user`` may read it; missing and unreadable entries both raise EntryNotFoundException."""
    entry = Entry.objects.readable(user).select_related("entry_class").filter(pk=entry_id).first()
    if entry is None:
        raise EntryNotFoundException(detail="That entry could not be found.")
    return entry


def get_readable_entity(user: CradleUser, entity_id: int) -> Entry:
    """Return the entity if ``user`` may read it; missing and unreadable entities both raise EntityNotFoundException."""
    entity = Entry.entities.readable_entities(user).filter(pk=entity_id).first()
    if entity is None:
        raise EntityNotFoundException(detail="That entity could not be found.")
    return entity

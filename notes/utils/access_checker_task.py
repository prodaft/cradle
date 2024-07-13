from typing import Dict, Set
from entries.enums import EntryType
from entries.models import Entry
from access.models import Access
from user.models import CradleUser
from ..exceptions import NoAccessToEntriesException
from access.enums import AccessType


class AccessCheckerTask:

    def __init__(self, user: CradleUser):
        self.user = user

    def run(
        self, referenced_entries: Dict[str, Dict[str, Set[Entry]]]
    ) -> Dict[str, Dict[str, Set[Entry]]]:
        """Checks whether the user has read-write access to a list of entities
        that were referenced in the note. If the user does not have read-write
        access to all of them, they will receive an error message as if the
        entity would not exist.

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing sets of entries being referenced. In the
            entity of this task, the old dictionary is returned.

        Raises:
            NoAccessToEntriesException: The referenced entities do not exist.
        """

        required_access = {AccessType.READ_WRITE}

        if not Access.objects.has_access_to_entities(
            self.user, referenced_entries[EntryType.ENTITY], required_access
        ):
            raise NoAccessToEntriesException()
        return referenced_entries

from access.enums import AccessType
from access.models import Access
from notes.exceptions import (
    NoAccessToEntriesException,
)

from .base_task import BaseTask
from ..models import Note


class AccessControlTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Check if the user has access to all the entries being refenced

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        access_level = {AccessType.READ_WRITE}

        inaccessible = Access.objects.inaccessible_entries(
            self.user,
            note.entries,
            access_level,
        )

        for i in inaccessible.all():
            raise NoAccessToEntriesException([i])

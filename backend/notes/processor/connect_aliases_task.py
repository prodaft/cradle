from typing import Iterable, Tuple


from entries.models import Entry

from ..models import Note
from ..tasks import connect_aliases
from .base_task import BaseTask


class AliasConnectionTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        return connect_aliases.si(note.id, self.user.id if self.user else None), entries

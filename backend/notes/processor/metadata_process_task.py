from typing import Iterable, Tuple

from entries.models import Entry

from ..markdown.to_metadata import infer_metadata
from ..models import Note
from .base_task import BaseTask


class MetadataProcessTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Note, Iterable[Entry]]:
        """
        Process the metadata frontmatter of a note and set relevant fields.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        metadata = infer_metadata(note.content)

        for key, field in Note.metadata_fields.items():
            if field:
                setattr(note, field, getattr(Note, field, None).field.default)
            if key not in metadata:
                continue

            value = metadata.get(key)

            if field is None:
                metadata.pop(key, None)
                continue

            setattr(note, field, value)

        note.metadata = metadata

        return None, entries

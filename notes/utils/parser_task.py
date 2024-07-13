import re
from typing import Set, Dict
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from uuid import UUID

LINK_REGEX = r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"  # noqa: E501 to avoid splitting the regex on two lines

EntitySubtypes = set(["case"])

class ParserTask:
    __mocked_uuid = UUID(int=0)

    def run(self, note_content: str) -> Dict[str, Dict[str, Set[Entry]]]:
        """Extract the references to various entries from the content of the note.

        Args:
            note_content: The text that was written in the note.

        Returns:
            A dictionary mapping the entry types with a set of the entries
            being referenced.
        """

        referenced_entries: Dict[str, Dict[str, Set[Entry]]] = {
            EntryType.ARTIFACT: {},
            EntryType.ENTITY: {},
        }
        # references will be a list of tuples which describe matches in
        # the note content
        references = re.findall(LINK_REGEX, note_content)

        for r in references:
            if r[0] in EntitySubtypes:
                t = EntryType.ENTITY
            else:
                t = EntryType.ARTIFACT

            if r[0] not in referenced_entries[t]:
                referenced_entries[t][r[0]] = set()

            referenced_entries[t][r[0]].add(Entry(
                        id=self.__mocked_uuid, name=r[1], entry_class=EntryClass(type=t, subtype=r[0]))
                    )

        return referenced_entries

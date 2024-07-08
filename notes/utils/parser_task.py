import re
from typing import Set, Dict
from entries.models import Entry
from entries.enums import ArtifactSubtype, MetadataSubtype
from uuid import UUID


class ParserTask:

    __allowed_subtypes = {
        "artifact": set([artifact_subtype.value for artifact_subtype in ArtifactSubtype]),
        "metadata": set(
            [metadata_subtype.value for metadata_subtype in MetadataSubtype]
        ),
    }

    __entry_regexes = {
        # [[actor:name|alias]]
        "actor": r"\[\[actor:((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[case:name|alias]]
        "case": r"\[\[case:((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[artifact_type:name|alias]]
        "artifact": r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[metadata-type:name|alias]]
        "metadata": r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
    }

    __mocked_uuid = UUID(int=0)

    def run(self, note_content: str) -> Dict[str, Set[Entry]]:
        """Extract the references to various entries from the content of the note.

        Args:
            note_content: The text that was written in the note.

        Returns:
            A dictionary mapping the entry types with a set of the entries
            being referenced.
        """

        referenced_entries = {}
        for entry, regex in self.__entry_regexes.items():
            # references will be a list of tuples which describe matches in
            # the note content
            references = re.findall(regex, note_content)

            # for now, this applies for entries that have subtypes i.e.
            # artifacts & metadata
            if entry in list(self.__allowed_subtypes.keys()):
                # each ref is of the form: (type, name, alias)

                # filter out references which have invalid types
                valid_references = filter(
                    lambda tup: tup[0] in self.__allowed_subtypes[entry], references
                )

                # create entries that contain attributes specified in the references
                referenced_entries[entry] = set(
                    map(
                        lambda tup: Entry(
                            id=self.__mocked_uuid,
                            name=tup[1],
                            type=entry,
                            subtype=tup[0],
                        ),
                        valid_references,
                    )
                )
            else:
                # each ref is of the form: (name, alias)

                # create entries that contain attributes specified in the references
                referenced_entries[entry] = set(
                    map(
                        lambda tup: Entry(
                            id=self.__mocked_uuid, name=tup[0], type=entry
                        ),
                        references,
                    )
                )

        return referenced_entries

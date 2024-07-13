from entries.enums import EntryType
from entries.models import Entry, EntryClass
from typing import Dict, Set


class ArtifactCreationTask:

    def __get_or_create_entries(
        self, referenced_entries: Set[Entry]
    ) -> Set[Entry]:
        """For each entry in the given set, either get it from the database
        or create it and get the newly saved entry.

        Args:
            referenced_entries: A set containing entries.

        Returns:
            A new set containing entries, but with ids that correspond
            to the saved entries having those fields.
        """

        saved_entries = set()

        for entry in referenced_entries:
            entry.entry_class.save()
            saved_entries.add(
                # get_or_create returns a tuple, where the first value
                # is the persisted entry and the second one
                # is a boolean indicating if the entry was created
                Entry.objects.get_or_create(
                    name=entry.name,
                    entry_class=entry.entry_class
                )[0]
            )

        return saved_entries

    def run(
        self, referenced_entries: Dict[str, Dict[str, Set[Entry]]]
    ) -> Dict[str, Dict[str, Set[Entry]]]:
        """For each referenced metadata or artifact, it tries to search for that entry
        in that database. If it does not exist, it creates it and returns the newly
        saved entry.

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing the sets of referenced entries, but with ids
            that correspond to the saved entries having those fields.
        """
        artifacts = referenced_entries[EntryType.ARTIFACT]

        for entry_type in artifacts:
            artifacts[entry_type] = self.__get_or_create_entries(
                artifacts[entry_type]
            )

        return referenced_entries

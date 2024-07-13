from .access_checker_task import AccessCheckerTask
from .parser_task import ParserTask
from .entry_checker_task import EntryCheckerTask
from .artifact_creation_task import ArtifactCreationTask
from .count_references_task import CountReferencesTask
from user.models import CradleUser


class TaskScheduler:

    def __init__(self, note_content: str, user: CradleUser):
        self.note_content = note_content
        self.preprocessing = ParserTask()
        self.processing = [
            CountReferencesTask(),
            EntryCheckerTask(),
            AccessCheckerTask(user),
            ArtifactCreationTask(),
        ]

    def run_pipeline(self):
        """Performs all of the checks that are necessary for creating a note.
        First, it creates a dictionary mapping entry types to all of the referenced
        entries in the note. Then, it performs the mentioned checks. Lastly, it
        constructs a list of all referenced entries with the ids corresponding
        to the persisted entries.

        Returns:
            A list of all referenced entries. Their id fields are populated to
            correspond to the ids of persisted entries.

        Raises:
            NotEnoughReferencesException: if the note does not reference at
            least one entity and at least two entries.
            EntriesDoNotExistException: if the note references entities that do
            not exist.
            NoAccessToEntriesException: if the user does not have access to the
            referenced entities.
        """

        entry_references_dictionary = self.preprocessing.run(self.note_content)
        for task in self.processing:
            entry_references_dictionary = task.run(entry_references_dictionary)

        # create the final list of entries
        final_entry_references = []

        for entry_set in entry_references_dictionary.values():
            for x in entry_set.values():
                final_entry_references.extend(x)

        return final_entry_references

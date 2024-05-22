from .access_checker_task import AccessCheckerTask
from .parser_task import ParserTask
from .entity_checker_task import EntityCheckerTask
from .entity_creation_task import EntityCreationTask
from .count_references_task import CountReferencesTask
from user.models import CradleUser


class TaskScheduler:

    def __init__(self, note_content: str, user: CradleUser):
        self.note_content = note_content
        self.preprocessing = ParserTask()
        self.processing = [
            CountReferencesTask(),
            EntityCheckerTask(),
            AccessCheckerTask(user),
            EntityCreationTask(),
        ]

    def run_pipeline(self):
        """Performs all of the checks that are necessary for creating a note.
        First, it creates a dictionary mapping entity types to all of the referenced
        entities in the note. Then, it performs the mentioned checks. Lastly, it
        constructs a list of all referenced entities with the ids corresponding
        to the persisted entities.

        Returns:
            A list of all referenced entities. Their id fields are populated to
            correspond to the ids of persisted entities.

        Raises:
            NotEnoughReferencesException: if the note does not reference at
            least one case and at least two entities.
            EntitiesDoNotExistException: if the note references actors or cases
            that do not exist.
            NoAccessToEntitiesException: if the user does not have access to the
            referenced cases.
        """

        entity_references_dictionary = self.preprocessing.run(self.note_content)
        for task in self.processing:
            entity_references_dictionary = task.run(entity_references_dictionary)

        # create the final list of entities
        final_entity_references = []
        for entity_set in entity_references_dictionary.values():
            final_entity_references.extend(entity_set)

        return final_entity_references

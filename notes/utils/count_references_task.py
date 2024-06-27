from typing import Dict, Set
from entities.models import Entity
from ..exceptions import NotEnoughReferencesException


class CountReferencesTask:

    def run(
        self, referenced_entities: Dict[str, Set[Entity]]
    ) -> Dict[str, Set[Entity]]:
        """Checks that the note references at least one case and at least 2 entities
        (including the referenced cases).

        Args:
            referenced_entities: Dictionary containing sets of the entities being
            referenced in the note sent by the user.

        Returns:
            An updated dictionary containing sets of the entities. In the case of this
            task, the dictionary is not updated.

        Raises:
            NotEnoughReferencesException: The note does not reference at least one case
                and at least two entities.
        """

        referenced_cases = len(referenced_entities["case"])
        reference_count = sum(
            len(entity_set) for entity_set in referenced_entities.values()
        )

        if referenced_cases == 0 or reference_count < 2:
            raise NotEnoughReferencesException()

        return referenced_entities

from typing import Dict, Set
from entities.models import Entity
from ..exceptions import EntitiesDoNotExistException


class EntityCheckerTask:

    __checked_entities = {"actor", "case"}

    def __apply_check_for_entity(
        self, entity: str, referenced_entities: Set[Entity]
    ) -> Set[Entity]:
        """For the given entity type, check that all of the references exist
        in the database.

        Args:
            entity: Specifies the entity check
            referenced_entities: Set containing the references of that type

        Returns:
            True iff all referenced entities exist.

        Raises:
            EntitiesDoNotExistException: The referenced actors or cases do not exist.
        """

        referenced_names = [e.name for e in referenced_entities]
        existing_entities = set(
            Entity.objects.filter(type=entity, name__in=referenced_names)
        )

        if len(existing_entities) != len(referenced_entities):
            raise EntitiesDoNotExistException()

        return existing_entities

    def run(
        self, referenced_entities: Dict[str, Set[Entity]]
    ) -> Dict[str, Set[Entity]]:
        """Checks that all of the referenced cases and actors exist. If this
        holds, the cases and actors are changed to their persisted versions.

        Args:
            referenced_entities: Dictionary containing sets of the entities being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing sets of entities being referenced. In the
            case of this task, the case and actor entities are being updated to
            also contain their corresponding ids from the database.

        Raises:
            Http404: The referenced actors or cases do not exist.
        """

        for entity_type in self.__checked_entities:
            referenced_entities[entity_type] = self.__apply_check_for_entity(
                entity_type, referenced_entities[entity_type]
            )

        return referenced_entities

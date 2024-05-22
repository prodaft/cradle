from entities.models import Entity
from typing import Dict, Set


class EntityCreationTask:

    __considered_entity_types = {"metadata", "entry"}

    def __get_or_create_entities(
        self, referenced_entitites: Set[Entity]
    ) -> Set[Entity]:
        """For each entity in the given set, either get it from the database
        or create it and get the newly saved entity.

        Args:
            referenced_entities: A set containing entities.

        Returns:
            A new set containing entities, but with ids that correspond
            to the saved entities having those fields.
        """

        saved_entities = set()

        for entity in referenced_entitites:
            saved_entities.add(
                # get_or_create returns a tuple, where the first value
                # is the persisted entity and the second one
                # is a boolean indicating if the entity was created
                Entity.objects.get_or_create(
                    name=entity.name, type=entity.type, subtype=entity.subtype
                )[0]
            )

        return saved_entities

    def run(
        self, referenced_entities: Dict[str, Set[Entity]]
    ) -> Dict[str, Set[Entity]]:
        """For each referenced metadata or entry, it tries to search for that entity
        in that database. If it does not exist, it creates it and returns the newly
        saved entity.

        Args:
            referenced_entities: Dictionary containing sets of the entities being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing the sets of referenced entities, but with ids
            that correspond to the saved entities having those fields.
        """

        for entity_type in self.__considered_entity_types:
            referenced_entities[entity_type] = self.__get_or_create_entities(
                referenced_entities[entity_type]
            )

        return referenced_entities

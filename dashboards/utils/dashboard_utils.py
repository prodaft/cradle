from django.db.models.query import QuerySet
from typing import Dict, Any, Tuple, List
from django.db.models import Q

from user.models import CradleUser
from entities.models import Entity
from entities.enums import EntityType
from notes.models import Note
from access.models import Access
from access.enums import AccessType

from uuid import UUID


class DashboardUtils:

    @staticmethod
    def add_entity_fields(
        entity: Entity, dashboard_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add the related entities of the entity to the dashboard dictionary

        Args:
            entity: The entity whose related entities are being added
            dashboard_dict: The dictionary containing the related entities

        Returns:
            dict: The updated dictionary containing the related entities
        """
        dashboard_dict["id"] = entity.id
        dashboard_dict["name"] = entity.name
        dashboard_dict["description"] = entity.description
        dashboard_dict["type"] = entity.type
        dashboard_dict["subtype"] = entity.subtype

        return dashboard_dict

    @staticmethod
    def add_neighbors_to_map(
        neighbor_map: Dict[str, List[Entity]], entities: QuerySet, neighbor_id: UUID
    ) -> Dict[str, List[Entity]]:
        """Add the neighbor of the entities to the neighbor map

        Args:
            neighbor_map: The map containing the neighbors
            entities: The entities whose neighbor are being added
            neighbor_id: The id of the neighbor

        Returns:
            dict: The updated neighbor map
        """

        entity_second_hop_ids = entities.values_list("id", flat=True)

        for accessible_entity_id in entity_second_hop_ids:
            if neighbor_map.get(str(accessible_entity_id)) is None:
                neighbor_map[str(accessible_entity_id)] = [
                    Entity.objects.get(id=neighbor_id)
                ]
            else:
                neighbor_map[str(accessible_entity_id)].append(
                    Entity.objects.get(id=neighbor_id)
                )

        return neighbor_map

    @staticmethod
    def get_second_hop_entities(
        user: CradleUser,
        entity_id: UUID,
        accessible_entities: QuerySet,
        inaccessible_entities: QuerySet,
    ) -> Tuple[QuerySet, QuerySet, Dict[str, List[Entity]]]:
        """Returns a 3-tuple consisting of:
        The accessible entities from the second hop of the specified entity
        The inaccessible entities from the second hop of the specified entity
        A map representing the neighbor from the first hop for each second-hop entity

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entity whose entities are being retrieved
            accessible_entities: The entities that the user has access to
                from the second hop
            inaccessible_entities: The entities that
                the user does not have access to form the second hop

        Returns:
            Tuple[QuerySet, QuerySet, Dict[str, Entity]]:
                The second hop entities,
                the second hop inaccessible entities,
                the neighbor map
        """

        neighbor_types = [EntityType.ENTRY]
        neighbor_entities = accessible_entities.filter(type__in=neighbor_types)

        all_entities_second_hop = Entity.objects.none()
        all_inaccessible_entities_second_hop = Entity.objects.none()

        neighbor_map: dict[str, List[Entity]] = {}

        for id in neighbor_entities.values_list("id", flat=True):
            entity_notes = Note.objects.get_accessible_notes(user, id)
            entity_inaccessible_notes = Note.objects.get_inaccessible_notes(user, id)

            notes_entities = Note.objects.get_entities_from_notes(entity_notes)
            inaccessible_notes_entities = Note.objects.get_entities_from_notes(
                entity_inaccessible_notes
            )

            neighbor_map = DashboardUtils.add_neighbors_to_map(
                neighbor_map, notes_entities, id
            )
            neighbor_map = DashboardUtils.add_neighbors_to_map(
                neighbor_map, inaccessible_notes_entities, id
            )

            all_entities_second_hop = all_entities_second_hop | notes_entities
            all_inaccessible_entities_second_hop = (
                all_inaccessible_entities_second_hop | inaccessible_notes_entities
            )

        entities_second_hop = all_entities_second_hop.filter(
            ~Q(id__in=accessible_entities) & ~Q(id=entity_id)
        )

        inaccessible_entities_second_hop = all_inaccessible_entities_second_hop.filter(
            ~Q(id__in=inaccessible_entities)
            & ~Q(id=entity_id)
            & ~Q(id__in=entities_second_hop)
            & ~Q(id__in=accessible_entities)
        )

        return entities_second_hop, inaccessible_entities_second_hop, neighbor_map

    @staticmethod
    def get_dashboard(
        user: CradleUser, entity_id: UUID
    ) -> Tuple[Dict[str, QuerySet], Dict[str, List[Entity]]]:
        """Get the entities related to the specified entity that the user has access to

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entity whose entities are being retrieved

        Returns: A dictionary containing
            the related entities of this entity for each type
            {
                "notes": notes,
                "actors": actors,
                "cases": cases,
                "metadata": metadata,
                "entries": entries
                "inaccessible_cases": inaccessible_cases
                "inaccessible_actors": inaccessible_actors
                "inaccessible_metadata": inaccessible_metadata
                "inaccessible_entries": inaccessible_entries
                "second_hop_cases": second_hop_cases
                "second_hop_actors": second_hop_actors
                "second_hop_metadata": second_hop_metadata
                "second_hop_inaccessible_cases": second_hop_inaccessible_cases
                "second_hop_inaccessible_actors": second_hop_inaccessible_actors
                "second_hop_inaccessible_metadata": second_hop_inaccessible_metadata
            }

        """
        accessible_notes = Note.objects.get_accessible_notes(user, entity_id)
        accessible_entities = Note.objects.get_entities_from_notes(
            accessible_notes
        ).exclude(id=entity_id)

        inaccessible_notes = Note.objects.get_inaccessible_notes(user, entity_id)
        inaccessible_notes_entities = Note.objects.get_entities_from_notes(
            inaccessible_notes
        ).exclude(id=entity_id)

        accessible_case_ids = Access.objects.filter(
            user=user, access_type__in=[AccessType.READ_WRITE, AccessType.READ]
        ).values_list("case_id", flat=True)

        inaccessible_entities = inaccessible_notes_entities.exclude(
            id__in=accessible_entities or accessible_case_ids
        )

        entities_second_hop, inaccessible_entities_second_hop, neighbor_map = (
            DashboardUtils.get_second_hop_entities(
                user, entity_id, accessible_entities, inaccessible_entities
            )
        )

        return_dict = {}

        return_dict["notes"] = accessible_notes
        return_dict["actors"] = accessible_entities.filter(type=EntityType.ACTOR)
        return_dict["cases"] = accessible_entities.filter(type=EntityType.CASE)
        return_dict["metadata"] = accessible_entities.filter(type=EntityType.METADATA)
        return_dict["entries"] = accessible_entities.filter(type=EntityType.ENTRY)
        return_dict["inaccessible_cases"] = inaccessible_entities.filter(
            type=EntityType.CASE
        )
        return_dict["inaccessible_actors"] = inaccessible_entities.filter(
            type=EntityType.ACTOR
        )
        return_dict["inaccessible_metadata"] = inaccessible_entities.filter(
            type=EntityType.METADATA
        )
        return_dict["inaccessible_entries"] = inaccessible_entities.filter(
            type=EntityType.ENTRY
        )
        return_dict["second_hop_cases"] = entities_second_hop.filter(
            type=EntityType.CASE
        )
        return_dict["second_hop_actors"] = entities_second_hop.filter(
            type=EntityType.ACTOR
        )
        return_dict["second_hop_metadata"] = entities_second_hop.filter(
            type=EntityType.METADATA
        )
        return_dict["second_hop_inaccessible_cases"] = (
            inaccessible_entities_second_hop.filter(type=EntityType.CASE)
        )
        return_dict["second_hop_inaccessible_actors"] = (
            inaccessible_entities_second_hop.filter(type=EntityType.ACTOR)
        )
        return_dict["second_hop_inaccessible_metadata"] = (
            inaccessible_entities_second_hop.filter(type=EntityType.METADATA)
        )

        return return_dict, neighbor_map

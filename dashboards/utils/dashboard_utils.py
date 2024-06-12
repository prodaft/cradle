from django.db.models.query import QuerySet
from typing import Dict, Any
from user.models import CradleUser
from entities.models import Entity
from entities.enums import EntityType
from notes.models import Note


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
    def get_dashboard(user: CradleUser, entity_id: int) -> Dict[str, QuerySet]:
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
            }

        """
        accessible_notes = Note.objects.get_accessible_notes(user, entity_id)
        accessible_entities = Note.objects.get_entities_from_notes(
            accessible_notes
        ).exclude(id=entity_id)

        inaccessible_notes = Note.objects.get_inaccessible_notes(user, entity_id)

        inaccessible_notes_cases = (
            Note.objects.get_entities_from_notes(inaccessible_notes)
            .filter(type=EntityType.CASE)
            .exclude(id=entity_id)
        )

        inaccessible_cases = inaccessible_notes_cases.difference(accessible_entities)

        return_dict = {}

        return_dict["notes"] = accessible_notes
        return_dict["actors"] = accessible_entities.filter(type=EntityType.ACTOR)
        return_dict["cases"] = accessible_entities.filter(type=EntityType.CASE)
        return_dict["metadata"] = accessible_entities.filter(type=EntityType.METADATA)
        return_dict["entries"] = accessible_entities.filter(type=EntityType.ENTRY)
        return_dict["inaccessible_cases"] = inaccessible_cases

        return return_dict

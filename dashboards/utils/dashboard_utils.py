from django.db.models.query import QuerySet
from typing import Dict, Any, Tuple, List
from django.db.models import Q

from user.models import CradleUser
from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note
from access.models import Access
from access.enums import AccessType

from uuid import UUID


class DashboardUtils:

    @staticmethod
    def add_entry_fields(
        entry: Entry, dashboard_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add the related entries of the entry to the dashboard dictionary

        Args:
            entry: The entry whose related entries are being added
            dashboard_dict: The dictionary containing the related entries

        Returns:
            dict: The updated dictionary containing the related entries
        """
        dashboard_dict["id"] = entry.id
        dashboard_dict["name"] = entry.name
        dashboard_dict["description"] = entry.description
        dashboard_dict["type"] = entry.entry_class.type
        dashboard_dict["subtype"] = entry.entry_class.subtype

        return dashboard_dict

    @staticmethod
    def add_neighbors_to_map(
        neighbor_map: Dict[str, List[Entry]], entries: QuerySet, neighbor_id: UUID
    ) -> Dict[str, List[Entry]]:
        """Add the neighbor of the entries to the neighbor map

        Args:
            neighbor_map: The map containing the neighbors
            entries: The entries whose neighbor are being added
            neighbor_id: The id of the neighbor

        Returns:
            dict: The updated neighbor map
        """

        entry_second_hop_ids = entries.values_list("id", flat=True)

        for accessible_entry_id in entry_second_hop_ids:
            if neighbor_map.get(str(accessible_entry_id)) is None:
                neighbor_map[str(accessible_entry_id)] = [
                    Entry.objects.get(id=neighbor_id)
                ]
            else:
                neighbor_map[str(accessible_entry_id)].append(
                    Entry.objects.get(id=neighbor_id)
                )

        return neighbor_map

    @staticmethod
    def get_second_hop_entries(
        user: CradleUser,
        entry_id: UUID,
        accessible_entries: QuerySet,
        inaccessible_entries: QuerySet,
    ) -> Tuple[QuerySet, QuerySet, Dict[str, List[Entry]]]:
        """Returns a 3-tuple consisting of:
        The accessible entries from the second hop of the specified entry
        The inaccessible entries from the second hop of the specified entry
        A map representing the neighbor from the first hop for each second-hop entry

        Args:
            user: The user whose access is being checked
            entry_id: The id of the entry whose entries are being retrieved
            accessible_entries: The entries that the user has access to
                from the second hop
            inaccessible_entries: The entries that
                the user does not have access to form the second hop

        Returns:
            Tuple[QuerySet, QuerySet, Dict[str, Entry]]:
                The second hop entries,
                the second hop inaccessible entries,
                the neighbor map
        """

        neighbor_types = [EntryType.ARTIFACT]
        neighbor_entries = accessible_entries.filter(entry_class__type__in=neighbor_types)

        all_entries_second_hop = Entry.objects.none()
        all_inaccessible_entries_second_hop = Entry.objects.none()

        neighbor_map: dict[str, List[Entry]] = {}

        for id in neighbor_entries.values_list("id", flat=True):
            entry_notes = Note.objects.get_accessible_notes(user, id)
            entry_inaccessible_notes = Note.objects.get_inaccessible_notes(user, id)

            notes_entries = Note.objects.get_entries_from_notes(entry_notes)
            inaccessible_notes_entries = Note.objects.get_entries_from_notes(
                entry_inaccessible_notes
            )

            neighbor_map = DashboardUtils.add_neighbors_to_map(
                neighbor_map, notes_entries, id
            )
            neighbor_map = DashboardUtils.add_neighbors_to_map(
                neighbor_map, inaccessible_notes_entries, id
            )

            all_entries_second_hop = all_entries_second_hop | notes_entries
            all_inaccessible_entries_second_hop = (
                all_inaccessible_entries_second_hop | inaccessible_notes_entries
            )

        entries_second_hop = all_entries_second_hop.filter(
            ~Q(id__in=accessible_entries) & ~Q(id=entry_id)
        )

        inaccessible_entries_second_hop = all_inaccessible_entries_second_hop.filter(
            ~Q(id__in=inaccessible_entries)
            & ~Q(id=entry_id)
            & ~Q(id__in=entries_second_hop)
            & ~Q(id__in=accessible_entries)
        )

        return entries_second_hop, inaccessible_entries_second_hop, neighbor_map

    @staticmethod
    def get_dashboard(
        user: CradleUser, entry_id: UUID
    ) -> Tuple[Dict[str, QuerySet], Dict[str, List[Entry]]]:
        """Get the entries related to the specified entry that the user has access to

        Args:
            user: The user whose access is being checked
            entry_id: The id of the entry whose entries are being retrieved

        Returns: A dictionary containing
            the related entries of this entry for each type
            {
                "notes": notes,
                "entities": entities,
                "artifacts": artifacts
                "inaccessible_entities": inaccessible_entities
                "inaccessible_artifacts": inaccessible_artifacts
                "second_hop_entities": second_hop_entities
                "second_hop_inaccessible_entities": second_hop_inaccessible_entities
            }

        """
        accessible_notes = Note.objects.get_accessible_notes(user, entry_id)
        accessible_entries = Note.objects.get_entries_from_notes(
            accessible_notes
        ).exclude(id=entry_id)

        inaccessible_notes = Note.objects.get_inaccessible_notes(user, entry_id)
        inaccessible_notes_entries = Note.objects.get_entries_from_notes(
            inaccessible_notes
        ).exclude(id=entry_id)

        accessible_entity_ids = Access.objects.filter(
            user=user, access_type__in=[AccessType.READ_WRITE, AccessType.READ]
        ).values_list("entity_id", flat=True)

        inaccessible_entries = inaccessible_notes_entries.exclude(
            id__in=accessible_entries or accessible_entity_ids
        )

        entries_second_hop, inaccessible_entries_second_hop, neighbor_map = (
            DashboardUtils.get_second_hop_entries(
                user, entry_id, accessible_entries, inaccessible_entries
            )
        )

        return_dict = {}

        return_dict["notes"] = accessible_notes
        return_dict["entities"] = accessible_entries.filter(entry_class__type=EntryType.ENTITY)
        return_dict["artifacts"] = accessible_entries.filter(entry_class__type=EntryType.ARTIFACT)
        return_dict["inaccessible_entities"] = inaccessible_entries.filter(
            entry_class__type=EntryType.ENTITY
        )
        return_dict["inaccessible_artifacts"] = inaccessible_entries.filter(
            entry_class__type=EntryType.ARTIFACT
        )
        return_dict["second_hop_entities"] = entries_second_hop.filter(
            entry_class__type=EntryType.ENTITY
        )
        return_dict["second_hop_inaccessible_entities"] = (
            inaccessible_entries_second_hop.filter(entry_class__type=EntryType.ENTITY)
        )

        return return_dict, neighbor_map

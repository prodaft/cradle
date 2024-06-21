from entities.models import Entity
from entities.enums import EntityType
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils
from .utils import DashboardsTestCase


class DashboardUtilsDashboardJsonTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()

    def test_get_dashboard_json(self):

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        actors = Entity.actors.exclude(id=self.actor3.id)
        cases = Entity.objects.filter(id=self.case2.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.filter(type=EntityType.ENTRY)
        inaccessible_cases = Entity.objects.none()
        inaccessible_actors = Entity.objects.none()
        inaccessible_metadata = Entity.objects.none()
        inaccessible_entries = Entity.objects.none()
        second_hop_cases = Entity.objects.none()
        second_hop_actors = Entity.objects.none()
        second_hop_metadata = Entity.objects.none()
        second_hop_inaccessible_cases = Entity.objects.filter(id=self.case3.id)
        second_hop_inaccessible_actors = Entity.objects.filter(id=self.actor3.id)
        second_hop_inaccessible_metadata = Entity.objects.none()

        dashboard_json, nighbor_map = DashboardUtils.get_dashboard(
            user=self.user1, entity_id=self.case1.id
        )

        self.assertQuerySetEqual(dashboard_json["notes"], notes)
        self.assertQuerySetEqual(dashboard_json["actors"], actors, ordered=False)
        self.assertQuerySetEqual(dashboard_json["cases"], cases, ordered=False)
        self.assertQuerySetEqual(dashboard_json["metadata"], metadata, ordered=False)
        self.assertQuerySetEqual(dashboard_json["entries"], entries, ordered=False)
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_cases"], inaccessible_cases, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_actors"], inaccessible_actors, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_metadata"],
            inaccessible_metadata,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_entries"], inaccessible_entries, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_cases"], second_hop_cases, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_actors"], second_hop_actors, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_metadata"], second_hop_metadata, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_cases"],
            second_hop_inaccessible_cases,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_actors"],
            second_hop_inaccessible_actors,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_metadata"],
            second_hop_inaccessible_metadata,
            ordered=False,
        )


class AddEntityFieldsTest(DashboardsTestCase):

    def test_add_entity_fields(self):
        entity = Entity.objects.create(
            name="Entity", description="Description", type=EntityType.CASE, subtype=""
        )

        expected = {
            "id": entity.id,
            "name": "Entity",
            "description": "Description",
            "type": EntityType.CASE,
            "subtype": "",
        }

        self.assertEqual(DashboardUtils.add_entity_fields(entity, {}), expected)

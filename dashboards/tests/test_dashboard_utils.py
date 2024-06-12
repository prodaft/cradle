from entities.models import Entity
from entities.enums import EntityType
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils
from .utils import DashboardsTestCase


class DashboardUtilsDashboardJsonTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()
        self.case3 = Entity.objects.create(
            name="Case3", description="Description3", type=EntityType.CASE
        )
        self.note3 = Note.objects.create(content="Note3")
        self.note3.entities.add(self.case3, self.case1)

    def test_get_dashboard_json(self):

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(id=self.case2.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()
        inaccessible_cases = Entity.objects.filter(id=self.case3.id)

        dashboard_json = DashboardUtils.get_dashboard(
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

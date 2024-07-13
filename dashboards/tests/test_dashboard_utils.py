from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils
from .utils import DashboardsTestEntity


class DashboardUtilsDashboardJsonTest(DashboardsTestEntity):
    def setUp(self):
        super().setUp()

    def test_get_dashboard_json(self):

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.objects.filter(id=self.entity2.id)
        metadata = Entry.objects.filter(id=self.metadata1.id)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_entities = Entry.objects.none()
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_entities = Entry.objects.none()
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity3.id)
        second_hop_inaccessible_metadata = Entry.objects.none()

        dashboard_json, nighbor_map = DashboardUtils.get_dashboard(
            user=self.user1, entry_id=self.entity1.id
        )

        self.assertQuerySetEqual(dashboard_json["notes"], notes)
        self.assertQuerySetEqual(dashboard_json["entities"], entities, ordered=False)
        self.assertQuerySetEqual(dashboard_json["metadata"], metadata, ordered=False)
        self.assertQuerySetEqual(dashboard_json["artifacts"], artifacts, ordered=False)
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_entities"], inaccessible_entities, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_metadata"],
            inaccessible_metadata,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_artifacts"], inaccessible_artifacts, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_entities"], second_hop_entities, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_metadata"], second_hop_metadata, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_entities"],
            second_hop_inaccessible_entities,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_metadata"],
            second_hop_inaccessible_metadata,
            ordered=False,
        )


class AddEntryFieldsTest(DashboardsTestEntity):

    def test_add_entry_fields(self):
        entry = Entry.objects.create(
            name="Entry", description="Description", type=EntryType.ENTITY, subtype=""
        )

        expected = {
            "id": entry.id,
            "name": "Entry",
            "description": "Description",
            "type": EntryType.ENTITY,
            "subtype": "",
        }

        self.assertEqual(DashboardUtils.add_entry_fields(entry, {}), expected)

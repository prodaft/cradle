from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils
from .utils import DashboardsTestCase


class DashboardUtilsDashboardJsonTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()

    def test_get_dashboard_json(self):

        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        actors = Entry.actors.exclude(id=self.actor3.id)
        cases = Entry.objects.filter(id=self.case2.id)
        metadata = Entry.objects.filter(id=self.metadata1.id)
        artifacts = Entry.objects.filter(type=EntryType.ARTIFACT)
        inaccessible_cases = Entry.objects.none()
        inaccessible_actors = Entry.objects.none()
        inaccessible_metadata = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_cases = Entry.objects.none()
        second_hop_actors = Entry.objects.none()
        second_hop_metadata = Entry.objects.none()
        second_hop_inaccessible_cases = Entry.objects.filter(id=self.case3.id)
        second_hop_inaccessible_actors = Entry.objects.filter(id=self.actor3.id)
        second_hop_inaccessible_metadata = Entry.objects.none()

        dashboard_json, nighbor_map = DashboardUtils.get_dashboard(
            user=self.user1, entry_id=self.case1.id
        )

        self.assertQuerySetEqual(dashboard_json["notes"], notes)
        self.assertQuerySetEqual(dashboard_json["actors"], actors, ordered=False)
        self.assertQuerySetEqual(dashboard_json["cases"], cases, ordered=False)
        self.assertQuerySetEqual(dashboard_json["metadata"], metadata, ordered=False)
        self.assertQuerySetEqual(dashboard_json["artifacts"], artifacts, ordered=False)
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
            dashboard_json["inaccessible_artifacts"], inaccessible_artifacts, ordered=False
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


class AddEntryFieldsTest(DashboardsTestCase):

    def test_add_entry_fields(self):
        entry = Entry.objects.create(
            name="Entry", description="Description", type=EntryType.CASE, subtype=""
        )

        expected = {
            "id": entry.id,
            "name": "Entry",
            "description": "Description",
            "type": EntryType.CASE,
            "subtype": "",
        }

        self.assertEqual(DashboardUtils.add_entry_fields(entry, {}), expected)

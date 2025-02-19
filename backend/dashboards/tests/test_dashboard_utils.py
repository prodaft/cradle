import itertools
from entries.models import Entry
from entries.enums import EntryType
from notes.models import Note, Relation
from ..utils.dashboard_utils import DashboardUtils
from .utils import DashboardsTestCase


def gen_rels(notes):
    rels = []
    for note in notes:
        for i, j in itertools.product(note.entries.all(), note.entries.all()):
            if i == j:
                continue
            rels.append(
                Relation(
                    src_entry=i,
                    dst_entry=j,
                    note=note,
                )
            )
    return rels


class DashboardUtilsDashboardJsonTest(DashboardsTestCase):
    def setUp(self):
        super().setUp()

        rels = gen_rels([self.note1, self.note2, self.note3])
        Relation.objects.bulk_create(rels)

    def test_get_dashboard_json(self):
        notes = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        entities = Entry.objects.filter(id=self.entity2.id)
        artifacts = Entry.objects.filter(entry_class__type=EntryType.ARTIFACT)
        inaccessible_entities = Entry.objects.none()
        inaccessible_artifacts = Entry.objects.none()
        second_hop_entities = Entry.objects.none()
        second_hop_inaccessible_entities = Entry.objects.filter(id=self.entity3.id)

        dashboard_json, nighbor_map = DashboardUtils.get_dashboard(
            user=self.user1, entry_id=self.entity1.id
        )

        self.assertQuerySetEqual(dashboard_json["notes"], notes)
        self.assertQuerySetEqual(dashboard_json["entities"], entities, ordered=False)
        self.assertQuerySetEqual(dashboard_json["artifacts"], artifacts, ordered=False)
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_entities"],
            inaccessible_entities,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["inaccessible_artifacts"],
            inaccessible_artifacts,
            ordered=False,
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_entities"], second_hop_entities, ordered=False
        )
        self.assertQuerySetEqual(
            dashboard_json["second_hop_inaccessible_entities"],
            second_hop_inaccessible_entities,
            ordered=False,
        )


class AddEntryFieldsTest(DashboardsTestCase):
    def test_add_entry_fields(self):
        entry = Entry.objects.create(
            name="Entry", description="Description", entry_class=self.entityclass1
        )

        expected = {
            "id": entry.id,
            "name": "Entry",
            "description": "Description",
            "type": EntryType.ENTITY,
            "subtype": self.entityclass1.subtype,
        }

        self.assertEqual(DashboardUtils.add_entry_fields(entry, {}), expected)

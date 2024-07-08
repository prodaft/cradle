from entries.models import Entry
from .utils import EntriesTestCase

from entries.enums import EntryType, EntrySubtype


class EntryManagerTest(EntriesTestCase):

    def setUp(self):
        super().setUp()

        self.cases = [
            Entry.objects.create(
                name=f"Case {i}", description=f"{i}", type=EntryType.CASE
            )
            for i in range(0, 4)
        ]
        self.artifacts = []
        self.artifacts.append(
            Entry.objects.create(
                name="Artifact1",
                description="1",
                type=EntryType.ARTIFACT,
                subtype=EntrySubtype.USERNAME,
            )
        )
        self.artifacts.append(
            Entry.objects.create(
                name="EnTry2",
                description="2",
                type=EntryType.ARTIFACT,
                subtype=EntrySubtype.PASSWORD,
            )
        )
        self.artifacts.append(
            Entry.objects.create(
                name="Case",
                description="3",
                type=EntryType.ARTIFACT,
                subtype=EntrySubtype.PASSWORD,
            )
        )

    def test_get_filtered_entries_filters_by_name(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, EntryType.values, EntrySubtype.values, "Ent"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 2)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertTrue("ent" in result[i].name.lower())

    def test_get_filtered_entries_filters_by_entry_type(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, ["case"], EntrySubtype.values, ""
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 4)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].type, EntryType.CASE)

    def test_get_filtered_entries_filters_by_entry_subtype(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, ["artifact"], ["username"], ""
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].subtype, EntrySubtype.USERNAME)

    def test_get_filtered_entries_mixed_filters(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, ["artifact"], EntrySubtype.values, "Ent"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 2)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertTrue("ent" in result[i].name.lower())

    def test_get_filtered_entries_multiple_options(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, ["artifact", "case"], EntrySubtype.values, "Case"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 5)

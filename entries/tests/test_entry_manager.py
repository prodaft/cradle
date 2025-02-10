from entries.models import Entry
from .utils import EntriesTestCase


class EntryManagerTest(EntriesTestCase):
    def setUp(self):
        super().setUp()

        self.entities = [
            Entry.objects.create(
                name=f"Entity {i}", description=f"{i}", entry_class=self.entryclass1
            )
            for i in range(0, 4)
        ]
        self.artifacts = []
        self.artifacts.append(
            Entry.objects.create(
                name="Artifact1",
                description="1",
                entry_class=self.entryclass_username,
            )
        )
        self.artifacts.append(
            Entry.objects.create(
                name="EnTry2",
                description="2",
                entry_class=self.entryclass_password,
            )
        )
        self.artifacts.append(
            Entry.objects.create(
                name="Entity",
                description="3",
                entry_class=self.entryclass_password,
            )
        )
        self.subtypes = ["case", "username", "password"]

    def test_get_filtered_entries_filters_by_name(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset,
                self.subtypes,
                "Ent",
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 6)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertTrue("ent" in result[i].name.lower())

    def test_get_filtered_entries_filters_by_entry_subtype(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(initial_queryset, ["username"], "")
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].entry_class.subtype, "username")

    def test_get_filtered_entries_mixed_filters(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(initial_queryset, self.subtypes, "Ent")
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 6)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertTrue("ent" in result[i].name.lower())

    def test_get_filtered_entries_multiple_options(self):
        initial_queryset = Entry.objects.all()
        result = list(
            Entry.objects.get_filtered_entries(
                initial_queryset, self.subtypes, "Entity"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 5)

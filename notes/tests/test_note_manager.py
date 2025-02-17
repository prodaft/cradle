from .utils import NotesTestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from access.models import Access
from notes.models import Note

from collections import Counter


class DeleteUnfilteredEntriesTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.entity = Entry.objects.create(
            name="Clearly not an entity", entry_class=self.entryclass1
        )
        self.entity1 = Entry.objects.create(
            name="Unreferenced entity", entry_class=self.entryclass1
        )
        # init entries
        self.entries = [
            Entry.objects.create(name=f"Entry{i}", entry_class=self.entryclass_ip)
            for i in range(0, 4)
        ]

        self.metadata = [
            Entry.objects.create(
                name=f"Metadata{i}",
                entry_class=self.entryclass_country,
            )
            for i in range(0, 3)
        ]

        self.actor = Entry.objects.create(name="Actor", entry_class=self.entryclass2)

        self.note = Note.objects.create()
        self.note.entries.add(self.entries[0])
        self.note.entries.add(self.entries[1])
        self.note.entries.add(self.metadata[0])
        self.note.entries.add(self.metadata[1])

    def test_delete_unfiltered_entries(self):
        Note.objects.delete_unreferenced_entries()

        with self.subTest("Check unreferenced artifacts are deleted"):
            self.assertEqual(Entry.artifacts.count(), 4)
        with self.subTest("Check entities are not deleted"):
            self.assertEqual(Entry.entities.count(), 2)

        for i in range(2, 4):
            with self.assertRaises(Entry.DoesNotExist):
                Entry.objects.get(id=self.entries[i].id)

        with self.assertRaises(Entry.DoesNotExist):
            Entry.objects.get(id=self.metadata[2].id)


class AccessibleNotesTest(NotesTestCase):
    def create_users(self):
        self.user.is_staff = True
        self.user.is_cradle_admin = True
        self.user.save()

        self.admin_user = self.user
        self.user1 = CradleUser.objects.create_user(
            username="user1",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2",
            password="password",
            is_staff=False,
            email="c@d.e",
        )

    def create_tokens(self):
        self.token_user2 = str(AccessToken.for_user(self.user2))
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_user1 = str(AccessToken.for_user(self.user1))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_user1 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user1}"}
        self.headers_user2 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user2}"}

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entries.set([self.entity1, self.actor1, self.metadata1])
        self.note1.save()

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.set([self.entity2, self.actor2, self.entity1])
        self.note2.save()

        self.note3 = Note.objects.create(content="Note3")
        self.note3.entries.set([self.entity3])
        self.note3.save()

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description2", entry_class=self.entryclass1
        )

        self.entity3 = Entry.objects.create(
            name="Entity3", description="Description3", entry_class=self.entryclass1
        )

    def create_actors(self):
        self.actor1 = Entry.objects.create(
            name="Actor1", description="Description1", entry_class=self.entryclass2
        )

        self.actor2 = Entry.objects.create(
            name="Actor2", description="Description2", entry_class=self.entryclass2
        )

    def create_metadata(self):
        self.metadata1 = Entry.objects.create(
            name="Metadata1",
            description="Description1",
            entry_class=self.entryclass_country,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, entity=self.entity1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, entity=self.entity2, access_type="none"
        )

        self.access3 = Access.objects.create(
            user=self.user2, entity=self.entity1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user1, entity=self.entity3, access_type="read"
        )

        self.access5 = Access.objects.create(
            user=self.user2, entity=self.entity2, access_type="read"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_tokens()

        self.create_entities()

        self.create_actors()

        self.create_metadata()

        self.create_access()

        self.create_notes()

    def test_get_accessible_notes_admin(self):
        notes = Note.objects.get_accessible_notes(self.admin_user, self.entity1.id)
        expected = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_write_access(self):
        notes = Note.objects.get_accessible_notes(self.user1, self.entity1.id)
        expected = Note.objects.filter(id=self.note1.id)
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_access(self):
        notes = Note.objects.get_accessible_notes(self.user2, self.entity1.id)
        expected = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_no_access(self):
        notes = Note.objects.get_accessible_notes(self.user1, self.entity2.id)
        expected = Note.objects.none()
        self.assertQuerySetEqual(notes, expected)

    def test_get_all_accessible_notes_admin(self):
        notes = Note.objects.get_accessible_notes(self.admin_user)
        expected = Note.objects.all().order_by("-timestamp")

        self.assertQuerySetEqual(notes, expected)

    def test_get_all_accessible_notes_read_write_access(self):
        notes = Note.objects.get_accessible_notes(self.user1)
        expected = Note.objects.exclude(id=self.note2.id)

        self.assertQuerySetEqual(notes, expected, ordered=False)

    def test_get_all_accessible_notes_read_access(self):
        notes = Note.objects.get_accessible_notes(self.user2)
        expected = Note.objects.exclude(id=self.note3.id)

        self.assertQuerySetEqual(notes, expected, ordered=False)


class GetAllNotesTest(NotesTestCase):
    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entries.set([self.entity1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.set([self.entity2, self.actor2, self.entity1])

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description2", entry_class=self.entryclass1
        )

    def create_actors(self):
        self.actor1 = Entry.objects.create(
            name="Actor1", description="Description1", entry_class=self.entryclass2
        )

        self.actor2 = Entry.objects.create(
            name="Actor2", description="Description2", entry_class=self.entryclass2
        )

    def create_metadata(self):
        self.metadata1 = Entry.objects.create(
            name="Metadata1",
            description="Description1",
            entry_class=self.entryclass_country,
        )

        self.metadata2 = Entry.objects.create(
            name="Metadata2",
            description="Description1",
            entry_class=self.entryclass_country,
        )

    def setUp(self):
        super().setUp()

        self.create_entities()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

    def test_get_all_notes_multiple(self):
        notes = Note.objects.get_all_notes(self.entity1.id)
        expected = Note.objects.all()
        self.assertQuerySetEqual(notes, expected, ordered=False)

    def test_get_all_notes_single(self):
        notes = Note.objects.get_all_notes(self.entity2.id)
        expected = Note.objects.filter(id=self.note2.id)
        self.assertQuerySetEqual(notes, expected)

    def test_get_all_notes_no_notes(self):
        notes = Note.objects.get_all_notes(self.metadata2.id)
        expected = Note.objects.none()
        self.assertQuerySetEqual(notes, expected)


class GetEntriesOfTypeTest(NotesTestCase):
    def create_users(self):
        self.user.is_staff = True
        self.user.is_cradle_admin = True
        self.user.save()

        self.admin_user = self.user
        self.user1 = CradleUser.objects.create_user(
            username="user1",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2",
            password="password",
            is_staff=False,
            email="c@d.e",
        )

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entries.set([self.entity1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.set([self.entity2, self.actor2, self.entity1])

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description2", entry_class=self.entryclass1
        )

    def create_actors(self):
        self.actor1 = Entry.objects.create(
            name="Actor1", description="Description1", entry_class=self.entryclass2
        )

        self.actor2 = Entry.objects.create(
            name="Actor2", description="Description2", entry_class=self.entryclass2
        )

    def create_metadata(self):
        self.metadata1 = Entry.objects.create(
            name="Metadata1",
            description="Description1",
            entry_class=self.entryclass_country,
        )

        self.metadata2 = Entry.objects.create(
            name="Metadata2",
            description="Description1",
            entry_class=self.entryclass_country,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, entity=self.entity1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, entity=self.entity2, access_type="read"
        )

        self.access3 = Access.objects.create(
            user=self.user2, entity=self.entity1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user2, entity=self.entity2, access_type="none"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_entities()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

        self.create_access()

    def test_get_accessible_notes_admin(self):
        expected = Note.objects.all().order_by("-timestamp")
        notes = Note.objects.get_accessible_notes(self.admin_user, self.entity1.id)

        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_write_access(self):
        expected = Note.objects.all().order_by("-timestamp")
        notes = Note.objects.get_accessible_notes(self.user1, self.entity1.id)

        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_exclude_entity_without_access(self):
        expected = Note.objects.filter(id=self.note1.id)
        notes = Note.objects.get_accessible_notes(self.user2, self.entity1.id)

        self.assertQuerySetEqual(notes, expected)


class GetRelatedAccessibleEntriesTest(NotesTestCase):
    def create_users(self):
        self.user.is_staff = True
        self.user.is_cradle_admin = True
        self.user.save()

        self.admin_user = self.user
        self.user1 = CradleUser.objects.create_user(
            username="user1",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2",
            password="password",
            is_staff=False,
            email="c@d.e",
        )

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entries.set([self.entity1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.set([self.entity2, self.actor2, self.entity1])

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description2", entry_class=self.entryclass1
        )

    def create_actors(self):
        self.actor1 = Entry.objects.create(
            name="Actor1", description="Description1", entry_class=self.entryclass2
        )

        self.actor2 = Entry.objects.create(
            name="Actor2", description="Description2", entry_class=self.entryclass2
        )

    def create_metadata(self):
        self.metadata1 = Entry.objects.create(
            name="Metadata1",
            description="Description1",
            entry_class=self.entryclass_country,
        )

        self.metadata2 = Entry.objects.create(
            name="Metadata2",
            description="Description1",
            entry_class=self.entryclass_country,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, entity=self.entity1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, entity=self.entity2, access_type="read"
        )

        self.access3 = Access.objects.create(
            user=self.user2, entity=self.entity1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user2, entity=self.entity2, access_type="none"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_entities()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

        self.create_access()

    def test_related_accessible_entries_all(self):
        expected = Entry.objects.filter(entry_class__subtype="actor")
        entries = Note.objects.get_entries_from_notes(Note.objects.all()).filter(
            entry_class=self.entryclass2
        )

        self.assertQuerySetEqual(entries, expected, ordered=False)

    def test_related_accessible_entries_one_inaccessbile(self):
        expected = Entry.objects.filter(id=self.actor1.id)
        entries = Note.objects.get_entries_from_notes(
            Note.objects.filter(id=self.note1.id)
        ).filter(entry_class=self.entryclass2)

        self.assertQuerySetEqual(entries, expected)

    def test_related_accessible_entries_no_accessbile(self):
        expected = Entry.objects.none()
        entries = Note.objects.get_entries_from_notes(Note.objects.none()).filter(
            entry_class=self.entryclass2
        )

        self.assertQuerySetEqual(entries, expected)


class GetInOrderTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.notes = []
        for i in range(0, 4):
            self.notes.append(Note.objects.create(content=f"Note{i}"))

    def test_get_notes_in_order_ascending(self):
        ids = [self.notes[0].id, self.notes[1].id]
        notes = list(Note.objects.get_in_order(ids))

        self.assertEqual(notes[0].id, self.notes[0].id)
        self.assertEqual(notes[1].id, self.notes[1].id)

    def test_get_notes_in_order_descending(self):
        ids = [self.notes[1].id, self.notes[0].id]
        notes = list(Note.objects.get_in_order(ids))

        self.assertEqual(notes[0].id, self.notes[1].id)
        self.assertEqual(notes[1].id, self.notes[0].id)

    def test_get_notes_in_order_random_order(self):
        ids = [self.notes[1].id, self.notes[0].id, self.notes[2].id]
        notes = list(Note.objects.get_in_order(ids))

        self.assertEqual(notes[0].id, self.notes[1].id)
        self.assertEqual(notes[1].id, self.notes[0].id)
        self.assertEqual(notes[2].id, self.notes[2].id)


class GetLinksTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.entities = [
            Entry.objects.create(name=f"c{i}", entry_class=self.entryclass1)
            for i in range(0, 2)
        ]
        self.actors = [
            Entry.objects.create(name=f"a{i}", entry_class=self.entryclass2)
            for i in range(0, 2)
        ]
        self.artifact = [
            Entry.objects.create(name=f"e{i}", entry_class=self.entryclass_ip)
            for i in range(0, 2)
        ]
        self.metadata = [
            Entry.objects.create(name=f"m{i}", entry_class=self.entryclass_country)
            for i in range(0, 2)
        ]

        self.note1 = Note.objects.create(content="1")
        self.note1.entries.set([self.entities[1], self.actors[0], self.metadata[0]])
        self.note2 = Note.objects.create(content="2")
        self.note2.entries.set([self.entities[0], self.metadata[1], self.artifact[1]])

        self.note3 = Note.objects.create(content="3")
        self.note3.entries.set([self.entities[0], self.entities[1]])

    def test_get_links_one_note(self):
        links = list(Note.objects.get_links(Note.objects.filter(id=self.note1.id)))
        expected = [
            tuple(sorted((self.entities[1].id, self.actors[0].id))),
            tuple(sorted((self.entities[1].id, self.metadata[0].id))),
            tuple(sorted((self.actors[0].id, self.metadata[0].id))),
        ]

        links = [tuple(sorted(d.values())) for d in links]
        self.assertEqual(Counter(links), Counter(expected))

    def test_get_links_two_notes(self):
        links = list(Note.objects.get_links(Note.objects.exclude(id=self.note1.id)))
        links = [tuple(sorted(d.values())) for d in links]
        expected = [
            tuple(sorted((self.entities[0].id, self.metadata[1].id))),
            tuple(sorted((self.entities[0].id, self.artifact[1].id))),
            tuple(sorted((self.artifact[1].id, self.metadata[1].id))),
            tuple(sorted((self.entities[0].id, self.entities[1].id))),
        ]

        self.assertEqual(Counter(links), Counter(expected))

    def test_get_links_no_notes(self):
        links = list(Note.objects.get_links(Note.objects.none()))
        links = [tuple(sorted(d.values())) for d in links]
        expected = []

        self.assertEqual(Counter(links), Counter(expected))

    def test_get_links_all_notes(self):
        links = list(Note.objects.get_links(Note.objects.all()))
        links = [tuple(sorted(d.values())) for d in links]
        expected = [
            tuple(sorted((self.entities[0].id, self.metadata[1].id))),
            tuple(sorted((self.entities[0].id, self.artifact[1].id))),
            tuple(sorted((self.artifact[1].id, self.metadata[1].id))),
            tuple(sorted((self.entities[0].id, self.entities[1].id))),
            tuple(sorted((self.entities[1].id, self.actors[0].id))),
            tuple(sorted((self.entities[1].id, self.metadata[0].id))),
            tuple(sorted((self.actors[0].id, self.metadata[0].id))),
        ]

        self.assertEqual(Counter(links), Counter(expected))

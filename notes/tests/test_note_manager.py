from .utils import NotesTestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken

from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from access.models import Access
from notes.models import Note

from collections import Counter


class DeleteUnfilteredEntitiesTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.case = Entity.objects.create(
            name="Clearly not a case", type=EntityType.CASE
        )
        self.case1 = Entity.objects.create(
            name="Unreferenced case", type=EntityType.CASE
        )
        # init entities
        self.entities = [
            Entity.objects.create(
                name=f"Entity{i}", type=EntityType.ENTRY, subtype=EntitySubtype.IP
            )
            for i in range(0, 4)
        ]

        self.metadata = [
            Entity.objects.create(
                name=f"Metadata{i}",
                type=EntityType.METADATA,
                subtype=EntitySubtype.COUNTRY,
            )
            for i in range(0, 3)
        ]

        self.actor = Entity.objects.create(name="Actor", type=EntityType.ACTOR)

        self.note = Note.objects.create()
        self.note.entities.add(self.entities[0])
        self.note.entities.add(self.entities[1])
        self.note.entities.add(self.metadata[0])
        self.note.entities.add(self.metadata[1])

    def test_delete_unfiltered_entities(self):
        Note.objects.delete_unreferenced_entities()

        with self.subTest("Check unreferenced entries are deleted"):
            self.assertEqual(Entity.entries.count(), 2)
        with self.subTest("Check unreferenced metadata is deleted"):
            self.assertEqual(Entity.metadata.count(), 2)
        with self.subTest("Check cases are not deleted"):
            self.assertEqual(Entity.cases.count(), 2)
        with self.subTest("Check actors are not deleted"):
            self.assertEqual(Entity.actors.count(), 1)

        for i in range(2, 4):
            with self.assertRaises(Entity.DoesNotExist):
                Entity.objects.get(id=self.entities[i].id)

        with self.assertRaises(Entity.DoesNotExist):
            Entity.objects.get(id=self.metadata[2].id)


class AccessibleNotesTest(NotesTestCase):

    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
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
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

        self.note3 = Note.objects.create(content="Note3")
        self.note3.entities.set([self.case3])

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

        self.case3 = Entity.objects.create(
            name="Case3", description="Description3", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, case=self.case2, access_type="none"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user1, case=self.case3, access_type="read"
        )

        self.access5 = Access.objects.create(
            user=self.user2, case=self.case2, access_type="read"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_tokens()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_access()

        self.create_notes()

    def test_get_accessible_notes_admin(self):
        notes = Note.objects.get_accessible_notes(self.admin_user, self.case1.id)
        expected = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_write_access(self):
        notes = Note.objects.get_accessible_notes(self.user1, self.case1.id)
        expected = Note.objects.filter(id=self.note1.id)
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_access(self):
        notes = Note.objects.get_accessible_notes(self.user2, self.case1.id)
        expected = Note.objects.exclude(id=self.note3.id).order_by("-timestamp")
        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_no_access(self):
        notes = Note.objects.get_accessible_notes(self.user1, self.case2.id)
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
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

        self.metadata2 = Entity.objects.create(
            name="Metadata2",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

    def setUp(self):
        super().setUp()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

    def test_get_all_notes_multiple(self):
        notes = Note.objects.get_all_notes(self.case1.id)
        expected = Note.objects.all()
        self.assertQuerySetEqual(notes, expected, ordered=False)

    def test_get_all_notes_single(self):
        notes = Note.objects.get_all_notes(self.case2.id)
        expected = Note.objects.filter(id=self.note2.id)
        self.assertQuerySetEqual(notes, expected)

    def test_get_all_notes_no_notes(self):
        notes = Note.objects.get_all_notes(self.metadata2.id)
        expected = Note.objects.none()
        self.assertQuerySetEqual(notes, expected)


class GetEntitiesOfTypeTest(NotesTestCase):
    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
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
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

        self.metadata2 = Entity.objects.create(
            name="Metadata2",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, case=self.case2, access_type="read"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user2, case=self.case2, access_type="none"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

        self.create_access()

    def test_get_accessible_notes_admin(self):
        expected = Note.objects.all().order_by("-timestamp")
        notes = Note.objects.get_accessible_notes(self.admin_user, self.case1.id)

        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_read_write_access(self):
        expected = Note.objects.all().order_by("-timestamp")
        notes = Note.objects.get_accessible_notes(self.user1, self.case1.id)

        self.assertQuerySetEqual(notes, expected)

    def test_get_accessible_notes_exclude_case_without_access(self):
        expected = Note.objects.filter(id=self.note1.id)
        notes = Note.objects.get_accessible_notes(self.user2, self.case1.id)

        self.assertQuerySetEqual(notes, expected)


class GetRelatedAccessibleEntitiesTest(NotesTestCase):
    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
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
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

        self.metadata2 = Entity.objects.create(
            name="Metadata2",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, case=self.case2, access_type="read"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user2, case=self.case2, access_type="none"
        )

    def setUp(self):
        super().setUp()

        self.create_users()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_notes()

        self.create_access()

    def test_related_accessible_entities_all(self):
        expected = Entity.actors.all()
        entities = Note.objects.get_entities_from_notes(Note.objects.all()).filter(
            type=EntityType.ACTOR
        )

        self.assertQuerySetEqual(entities, expected, ordered=False)

    def test_related_accessible_entities_one_inaccessbile(self):
        expected = Entity.objects.filter(id=self.actor1.id)
        entities = Note.objects.get_entities_from_notes(
            Note.objects.filter(id=self.note1.id)
        ).filter(type=EntityType.ACTOR)

        self.assertQuerySetEqual(entities, expected)

    def test_related_accessible_entities_no_accessbile(self):
        expected = Entity.objects.none()
        entities = Note.objects.get_entities_from_notes(Note.objects.none()).filter(
            type=EntityType.ACTOR
        )

        self.assertQuerySetEqual(entities, expected)


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
        self.cases = [
            Entity.objects.create(name=f"c{i}", type=EntityType.CASE)
            for i in range(0, 2)
        ]
        self.actors = [
            Entity.objects.create(name=f"a{i}", type=EntityType.ACTOR)
            for i in range(0, 2)
        ]
        self.entry = [
            Entity.objects.create(name=f"e{i}", type=EntityType.ENTRY)
            for i in range(0, 2)
        ]
        self.metadata = [
            Entity.objects.create(name=f"m{i}", type=EntityType.METADATA)
            for i in range(0, 2)
        ]

        self.note1 = Note.objects.create(content="1")
        self.note1.entities.set([self.cases[1], self.actors[0], self.metadata[0]])
        self.note2 = Note.objects.create(content="2")
        self.note2.entities.set([self.cases[0], self.metadata[1], self.entry[1]])

        self.note3 = Note.objects.create(content="3")
        self.note3.entities.set([self.cases[0], self.cases[1]])

    def test_get_links_one_note(self):
        links = list(Note.objects.get_links(Note.objects.filter(id=self.note1.id)))
        expected = [
            (self.cases[1].id, self.actors[0].id),
            (self.cases[1].id, self.metadata[0].id),
            (self.actors[0].id, self.metadata[0].id),
        ]

        links = [tuple(sorted(d.values())) for d in links]
        self.assertEqual(Counter(links), Counter(expected))

    def test_get_links_two_notes(self):
        links = list(Note.objects.get_links(Note.objects.exclude(id=self.note1.id)))
        links = [tuple(sorted(d.values())) for d in links]
        expected = [
            (self.cases[0].id, self.metadata[1].id),
            (self.cases[0].id, self.entry[1].id),
            (self.entry[1].id, self.metadata[1].id),
            (self.cases[0].id, self.cases[1].id),
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
            (self.cases[0].id, self.metadata[1].id),
            (self.cases[0].id, self.entry[1].id),
            (self.entry[1].id, self.metadata[1].id),
            (self.cases[0].id, self.cases[1].id),
            (self.cases[1].id, self.actors[0].id),
            (self.cases[1].id, self.metadata[0].id),
            (self.actors[0].id, self.metadata[0].id),
        ]

        self.assertEqual(Counter(links), Counter(expected))

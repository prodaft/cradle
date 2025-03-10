from ..models import Access
from ..enums import AccessType
from entries.models import Entry
from user.models import CradleUser
from .utils import AccessTestCase


class AccessManagerHasAccessTest(AccessTestCase):
    def create_users(self):
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="admin", email="b@c.d"
        )

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="entity1", entry_class=self.entryclass1
        )
        self.entity2 = Entry.objects.create(
            name="entity2", entry_class=self.entryclass1
        )
        self.entity3 = Entry.objects.create(
            name="entity3", entry_class=self.entryclass1
        )
        self.entity4 = Entry.objects.create(
            name="entity4", entry_class=self.entryclass1
        )

    def create_access(self):
        Access.objects.create(
            user=self.user, entity=self.entity1, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.user, entity=self.entity2, access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.user, entity=self.entity3, access_type=AccessType.NONE
        )

    def setUp(self):
        super().setUp()

        self.create_users()
        self.create_entities()
        self.create_access()

    def test_read_access(self):
        self.assertTrue(
            Access.objects.has_access_to_entities(
                self.user, {self.entity2}, {AccessType.READ}
            )
        )

    def test_read_write_access(self):
        self.assertTrue(
            Access.objects.has_access_to_entities(
                self.user, {self.entity1}, {AccessType.READ_WRITE}
            )
        )

    def test_read_and_read_write_access(self):
        self.assertTrue(
            Access.objects.has_access_to_entities(
                self.user,
                {self.entity1, self.entity2},
                {AccessType.READ_WRITE, AccessType.READ},
            )
        )

    def test_does_not_have_access_to_read_only(self):
        self.assertFalse(
            Access.objects.has_access_to_entities(
                self.user, {self.entity2}, {AccessType.READ_WRITE}
            )
        )

    def test_does_not_have_access_to_all(self):
        self.assertFalse(
            Access.objects.has_access_to_entities(
                self.user,
                {self.entity1, self.entity2, self.entity3},
                {AccessType.READ, AccessType.READ_WRITE},
            )
        )

    def test_does_not_have_access_unspecified_entity(self):
        self.assertFalse(
            Access.objects.has_access_to_entities(
                self.user, {self.entity4}, {AccessType.READ, AccessType.READ_WRITE}
            )
        )

    def test_has_access_to_empty_list(self):
        self.assertTrue(Access.objects.has_access_to_entities(self.user, {}, {}))

    def test_has_access_to_all_entities_is_cradle_admin(self):
        self.assertTrue(
            Access.objects.has_access_to_entities(
                self.admin,
                {self.entity1, self.entity2, self.entity3, self.entity4},
                {AccessType.READ_WRITE},
            )
        )


class AccessManagerGetAccessibleTest(AccessTestCase):
    def setUp(self):
        super().setUp()

        self.users = [
            CradleUser.objects.create_user(f"u{i}", "abcd", email=f"a{i}@gmail.com")
            for i in range(0, 3)
        ]
        self.entities = [
            Entry.objects.create(name=f"c{i}", entry_class=self.entryclass1)
            for i in range(0, 3)
        ]
        for i in range(0, 3):
            Access.objects.create(
                user=self.users[0],
                entity=self.entities[i],
                access_type=AccessType.READ_WRITE,
            )
        for i in range(0, 2):
            Access.objects.create(
                user=self.users[1], entity=self.entities[i], access_type=AccessType.READ
            )
        Access.objects.create(
            user=self.users[2], entity=self.entities[0], access_type=AccessType.NONE
        )
        Access.objects.create(
            user=self.users[2],
            entity=self.entities[1],
            access_type=AccessType.READ_WRITE,
        )
        Access.objects.create(
            user=self.users[2], entity=self.entities[2], access_type=AccessType.READ
        )

    def test_get_accessible_entity_ids_all(self):
        query_result = list(
            Access.objects.get_accessible_entity_ids(user_id=self.users[0].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 3)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[0], entity_id=query_result[i]
                ).access_type
                self.assertNotEqual(access_type, AccessType.NONE)

    def test_get_accessible_entity_ids_does_not_take_none(self):
        query_result = list(
            Access.objects.get_accessible_entity_ids(user_id=self.users[1].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 2)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[1], entity_id=query_result[i]
                ).access_type
                self.assertNotEqual(access_type, AccessType.NONE)

    def test_get_accessible_entity_ids_takes_all_not_none(self):
        query_result = list(
            Access.objects.get_accessible_entity_ids(user_id=self.users[2].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 2)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[2], entity_id=query_result[i]
                ).access_type
                self.assertNotEqual(access_type, AccessType.NONE)


class AccessManagerGetUsersWithAccessTest(AccessTestCase):
    def setUp(self):
        super().setUp()

        self.users = [
            CradleUser.objects.create_user(
                username=f"user{id}", password="password", email=f"a{id}@gmail.com"
            )
            for id in range(3)
        ]
        self.users.append(
            CradleUser.objects.create_superuser(
                username="admin", password="admin", email="alabala@gmail.com"
            )
        )

        self.entity = Entry.objects.create(name="Entity", entry_class=self.entryclass1)

        Access.objects.create(
            user=self.users[0], entity=self.entity, access_type=AccessType.NONE
        )
        Access.objects.create(
            user=self.users[1], entity=self.entity, access_type=AccessType.READ_WRITE
        )

    def test_get_users_with_access(self):
        self.assertCountEqual(
            [self.users[1].id, self.users[3].id],
            list(Access.objects.get_users_with_access(self.entity.id)),
        )


class AccessManagerCheckUserAccessTest(AccessTestCase):
    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.entity = Entry.objects.create(name="entity", entry_class=self.entryclass1)

    def test_check_user_access_has_access_type(self):
        Access.objects.create(
            user=self.user, entity=self.entity, access_type=AccessType.READ_WRITE
        )
        self.assertTrue(
            Access.objects.check_user_access(
                self.user, self.entity, AccessType.READ_WRITE
            )
        )

    def test_check_user_access_does_not_have_access_type(self):
        Access.objects.create(
            user=self.user, entity=self.entity, access_type=AccessType.READ
        )
        self.assertFalse(
            Access.objects.check_user_access(
                self.user, self.entity, AccessType.READ_WRITE
            )
        )

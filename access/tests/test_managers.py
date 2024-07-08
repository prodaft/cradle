from ..models import Access
from ..enums import AccessType
from entries.models import Entry
from entries.enums import EntryType
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

    def create_cases(self):
        self.case1 = Entry.objects.create(name="case1", type=EntryType.CASE)
        self.case2 = Entry.objects.create(name="case2", type=EntryType.CASE)
        self.case3 = Entry.objects.create(name="case3", type=EntryType.CASE)
        self.case4 = Entry.objects.create(name="case4", type=EntryType.CASE)

    def create_access(self):
        Access.objects.create(
            user=self.user, case=self.case1, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.user, case=self.case2, access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.user, case=self.case3, access_type=AccessType.NONE
        )

    def setUp(self):
        super().setUp()

        self.create_users()
        self.create_cases()
        self.create_access()

    def test_read_access(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.user, {self.case2}, {AccessType.READ}
            )
        )

    def test_read_write_access(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.user, {self.case1}, {AccessType.READ_WRITE}
            )
        )

    def test_read_and_read_write_access(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.user,
                {self.case1, self.case2},
                {AccessType.READ_WRITE, AccessType.READ},
            )
        )

    def test_does_not_have_access_to_read_only(self):
        self.assertFalse(
            Access.objects.has_access_to_cases(
                self.user, {self.case2}, {AccessType.READ_WRITE}
            )
        )

    def test_does_not_have_access_to_all(self):
        self.assertFalse(
            Access.objects.has_access_to_cases(
                self.user,
                {self.case1, self.case2, self.case3},
                {AccessType.READ, AccessType.READ_WRITE},
            )
        )

    def test_does_not_have_access_unspecified_case(self):
        self.assertFalse(
            Access.objects.has_access_to_cases(
                self.user, {self.case4}, {AccessType.READ, AccessType.READ_WRITE}
            )
        )

    def test_has_access_to_empty_list(self):
        self.assertTrue(Access.objects.has_access_to_cases(self.user, {}, {}))

    def test_has_access_to_all_cases_is_superuser(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.admin,
                {self.case1, self.case2, self.case3, self.case4},
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
        self.cases = [
            Entry.objects.create(name=f"c{i}", type="case") for i in range(0, 3)
        ]
        for i in range(0, 3):
            Access.objects.create(
                user=self.users[0],
                case=self.cases[i],
                access_type=AccessType.READ_WRITE,
            )
        for i in range(0, 2):
            Access.objects.create(
                user=self.users[1], case=self.cases[i], access_type=AccessType.READ
            )
        Access.objects.create(
            user=self.users[2], case=self.cases[0], access_type=AccessType.NONE
        )
        Access.objects.create(
            user=self.users[2], case=self.cases[1], access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.users[2], case=self.cases[2], access_type=AccessType.READ
        )

    def test_get_accessible_case_ids_all(self):
        query_result = list(
            Access.objects.get_accessible_case_ids(user_id=self.users[0].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 3)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[0], case_id=query_result[i]["case_id"]
                ).access_type
                self.assertNotEqual(access_type, AccessType.NONE)

    def test_get_accessible_case_ids_does_not_take_none(self):
        query_result = list(
            Access.objects.get_accessible_case_ids(user_id=self.users[1].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 2)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[1], case_id=query_result[i]["case_id"]
                ).access_type
                self.assertNotEqual(access_type, AccessType.NONE)

    def test_get_accessible_case_ids_takes_all_not_none(self):
        query_result = list(
            Access.objects.get_accessible_case_ids(user_id=self.users[2].id)
        )
        with self.subTest("Correct number"):
            self.assertEqual(len(query_result), 2)
        for i in range(len(query_result)):
            with self.subTest("Test access type is not NONE"):
                access_type = Access.objects.get(
                    user=self.users[2], case_id=query_result[i]["case_id"]
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

        self.case = Entry.objects.create(name="Case", type=EntryType.CASE)

        Access.objects.create(
            user=self.users[0], case=self.case, access_type=AccessType.NONE
        )
        Access.objects.create(
            user=self.users[1], case=self.case, access_type=AccessType.READ_WRITE
        )

    def test_get_users_with_access(self):
        self.assertCountEqual(
            [self.users[1].id, self.users[3].id],
            list(Access.objects.get_users_with_access(self.case.id)),
        )


class AccessManagerCheckUserAccessTest(AccessTestCase):

    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.case = Entry.objects.create(name="case", type=EntryType.CASE)

    def test_check_user_access_has_access_type(self):
        Access.objects.create(
            user=self.user, case=self.case, access_type=AccessType.READ_WRITE
        )
        self.assertTrue(
            Access.objects.check_user_access(
                self.user, self.case, AccessType.READ_WRITE
            )
        )

    def test_check_user_access_does_not_have_access_type(self):
        Access.objects.create(
            user=self.user, case=self.case, access_type=AccessType.READ
        )
        self.assertFalse(
            Access.objects.check_user_access(
                self.user, self.case, AccessType.READ_WRITE
            )
        )

from django.test import TestCase
from ..models.cradle_user_model import CradleUser
from ..models.access_model import Access
from ..enums import AccessType
from entities.models import Entity
from entities.enums import EntityType


class AccessManagerTest(TestCase):

    def setUp(self):
        self.users = [
            CradleUser.objects.create_user(f"u{i}", "abcd") for i in range(0, 3)
        ]
        self.cases = [
            Entity.objects.create(name=f"c{i}", type="case") for i in range(0, 3)
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


class CaseUtilsHasAccessTest(TestCase):

    def create_user(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2", password="password", is_staff=False
        )

    def crete_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def crete_access(self):
        self.access1 = Access.objects.create(
            user=self.normal_user, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.normal_user, case=self.case2, access_type="none"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

    def setUp(self):
        self.create_user()

        self.crete_cases()
        self.crete_access()

    def test_user_admin(self):
        self.assertTrue(Access.objects.has_access_to_case(self.admin_user, self.case1))
        self.assertTrue(Access.objects.has_access_to_case(self.admin_user, self.case2))

    def test_user_no_access(self):
        self.assertFalse(
            Access.objects.has_access_to_case(self.normal_user, self.case2)
        )

    def test_user_read_write_access(self):
        self.assertTrue(Access.objects.has_access_to_case(self.normal_user, self.case1))

    def test_user_read_access(self):
        self.assertTrue(Access.objects.has_access_to_case(self.user2, self.case1))

    def test_access_not_existing(self):
        self.assertFalse(Access.objects.has_access_to_case(self.user2, self.case2))

from django.test import TestCase
from ..models.cradle_user_model import CradleUser
from ..models.access_model import Access
from ..enums import AccessType
from entities.models import Entity


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

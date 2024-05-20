from django.test import TestCase
from ..models.access_model import CradleUser, Access
from ..enums import AccessType
from entities.models import Entity
from entities.enums import EntityType


class AccessManagerTest(TestCase):

    def setUp(self):
        self.user1 = CradleUser.objects.create_user(username="user1", password="user1")
        self.user2 = CradleUser.objects.create_user(username="user2", password="user2")
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="admin"
        )

        self.case1 = Entity.objects.create(name="case1", type=EntityType.CASE)
        self.case2 = Entity.objects.create(name="case2", type=EntityType.CASE)
        self.case3 = Entity.objects.create(name="case3", type=EntityType.CASE)

        Access.objects.create(
            user=self.user1, case=self.case1, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.user1, case=self.case2, access_type=AccessType.READ_WRITE
        )

        Access.objects.create(
            user=self.user2, case=self.case1, access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.user2, case=self.case2, access_type=AccessType.NONE
        )

    def test_has_access_to_all_cases(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.user1, {self.case1.id, self.case2.id}
            )
        )

    def test_does_not_have_access_to_read_only(self):
        self.assertFalse(
            Access.objects.has_access_to_cases(self.user2, {self.case1.id})
        )

    def test_does_not_have_access_to_all(self):
        self.assertFalse(
            Access.objects.has_access_to_cases(
                self.user1, {self.case1.id, self.case2.id, self.case3.id}
            )
        )

    def test_has_access_to_empty_list(self):
        self.assertTrue(Access.objects.has_access_to_cases(self.user2, {}))

    def test_has_access_to_all_cases_is_superuser(self):
        self.assertTrue(
            Access.objects.has_access_to_cases(
                self.admin, {self.case1.id, self.case2.id, self.case3.id}
            )
        )

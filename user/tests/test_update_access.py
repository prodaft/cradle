from django.test import TestCase
from django.urls import reverse
from ..models import CradleUser, AccessType, Access
from entities.models import Entity
from rest_framework_simplejwt.tokens import AccessToken

from entities.enums import EntityType


class UpdateAccessTest(TestCase):

    def setUp(self):
        self.user = CradleUser.objects.create_user(username="user", password="pass")
        self.admin = CradleUser.objects.create_superuser(
            username="admin", password="pass"
        )
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.case, created = Entity.objects.get_or_create(
            name="Case 1", description="Cool case", type=EntityType.CASE
        )

    def test_update_access_successfully(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(
            Access.objects.get(user_id=self.user.id, case_id=self.case.id).access_type,
            AccessType.NONE,
        )
        self.assertEqual(response.status_code, 200)

    def test_update_access_not_authenticated(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": str(self.case.id)},
            ),
            {"access_type": "none"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_update_access_not_admin(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_access_user_not_found(self):
        response = self.client.put(
            reverse("update_access", kwargs={"user_id": 0, "case_id": self.case.id}),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_access_case_not_found(self):
        response = self.client.put(
            reverse("update_access", kwargs={"user_id": self.user.id, "case_id": 0}),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_access_already_exists(self):

        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers_admin,
        )

        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": self.case.id},
            ),
            {"access_type": "read"},
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(
            Access.objects.get(user_id=self.user.id, case_id=self.case.id).access_type,
            AccessType.READ,
        )
        self.assertEqual(response.status_code, 200)

    def test_update_access_no_access_type_mentioned(self):

        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.user.id, "case_id": self.case.id},
            ),
            {"access": "read"},
            content_type="application/json",
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 400)

from django.urls import reverse
from entities.models import Entity
from rest_framework_simplejwt.tokens import AccessToken

from entities.enums import EntityType
from user.models import CradleUser
from ..models import Access
from ..enums import AccessType
from .utils import AccessTestCase
from notifications.models import MessageNotification


class UpdateAccessTest(AccessTestCase):

    def setUp(self):
        super().setUp()

        self.users = [
            CradleUser.objects.create_user(username=f"user{id}", password="user")
            for id in range(3)
        ]
        self.users.append(
            CradleUser.objects.create_superuser(username="admin", password="admin")
        )
        self.case = Entity.objects.create(name="case", type=EntityType.CASE)

        self.tokens = [str(AccessToken.for_user(self.users[id])) for id in range(4)]
        self.headers = [
            {"HTTP_AUTHORIZATION": f"Bearer {self.tokens[id]}"} for id in range(4)
        ]

        Access.objects.create(
            user=self.users[0], case=self.case, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.users[1], case=self.case, access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.users[2], case=self.case, access_type=AccessType.NONE
        )

    def test_update_access_not_authenticated(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[2].id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(MessageNotification.objects.count(), 0)
        self.assertTrue(
            Access.objects.filter(
                user=self.users[2], case=self.case, access_type=AccessType.NONE
            ).exists()
        )

    def test_update_access_user_not_found(self):
        response = self.client.put(
            reverse("update_access", kwargs={"user_id": 0, "case_id": self.case.id}),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(MessageNotification.objects.count(), 0)

    def test_update_access_case_not_found(self):
        response = self.client.put(
            reverse(
                "update_access", kwargs={"user_id": self.users[2].id, "case_id": 0}
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(MessageNotification.objects.count(), 0)

    def test_update_access_admin_updates_admin(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[3].id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers[3],
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(MessageNotification.objects.count(), 0)

    def test_update_access_read_write_user_updates_admin(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[3].id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(MessageNotification.objects.count(), 0)

    def test_update_access_read_write_user_updates_read_write_user(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[0].id, "case_id": self.case.id},
            ),
            {"access_type": "none"},
            content_type="application/json",
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(MessageNotification.objects.count(), 0)
        self.assertTrue(
            Access.objects.filter(
                user=self.users[0], case=self.case, access_type=AccessType.READ_WRITE
            ).exists()
        )

    def test_update_access_user_does_not_have_access(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[2].id, "case_id": self.case.id},
            ),
            {"access_type": "read"},
            content_type="application/json",
            **self.headers[1],
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(MessageNotification.objects.count(), 0)
        self.assertTrue(
            Access.objects.filter(
                user=self.users[2], case=self.case, access_type=AccessType.NONE
            ).exists()
        )

    def test_update_access_bad_request(self):

        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[2].id, "case_id": self.case.id},
            ),
            {"access": "read"},
            content_type="application/json",
            **self.headers[3],
        )

        self.assertEqual(response.status_code, 400)

    def test_update_access_user_admin_successful(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[2].id, "case_id": self.case.id},
            ),
            {"access_type": "read"},
            content_type="application/json",
            **self.headers[3],
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(MessageNotification.objects.count(), 1)
        self.assertTrue(
            MessageNotification.objects.filter(
                user_id=self.users[2].id,
                message="Your access for case case has been changed to read",
            )
        )

        self.assertTrue(
            Access.objects.filter(
                user=self.users[2], case=self.case, access_type=AccessType.READ
            )
        )

    def test_update_access_user_read_write_successful(self):
        response = self.client.put(
            reverse(
                "update_access",
                kwargs={"user_id": self.users[2].id, "case_id": self.case.id},
            ),
            {"access_type": "read-write"},
            content_type="application/json",
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(MessageNotification.objects.count(), 1)
        self.assertTrue(
            MessageNotification.objects.filter(
                user_id=self.users[2].id,
                message="Your access for case case has been changed to read-write",
            )
        )

        self.assertTrue(
            Access.objects.filter(
                user=self.users[2], case=self.case, access_type=AccessType.READ_WRITE
            ).exists()
        )

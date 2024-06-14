from django.urls import reverse
from entities.models import Entity
from rest_framework_simplejwt.tokens import AccessToken

from entities.enums import EntityType
from user.models import CradleUser
from ..models import Access
from ..enums import AccessType
from .utils import AccessTestCase
from notifications.models import AccessRequestNotification


class UpdateAccessTest(AccessTestCase):

    def setUp(self):
        super().setUp()

        self.users = [
            CradleUser.objects.create_user(username=f"user{id}", password="user")
            for id in range(4)
        ]
        self.users.append(
            CradleUser.objects.create_superuser(username="admin", password="admin")
        )

        self.case = Entity.objects.create(name="case", type=EntityType.CASE)

        Access.objects.create(
            user=self.users[1], case=self.case, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.users[2], case=self.case, access_type=AccessType.READ
        )
        Access.objects.create(
            user=self.users[3], case=self.case, access_type=AccessType.NONE
        )

        self.tokens_users = [
            str(AccessToken.for_user(self.users[id])) for id in range(5)
        ]

        self.headers = [
            {"HTTP_AUTHORIZATION": f"Bearer {self.tokens_users[id]}"} for id in range(5)
        ]

    def test_request_access_not_authenticated(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"case_id": self.case.id},
            )
        )

        self.assertEqual(response.status_code, 401)

    def test_request_access_case_does_not_exist(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"case_id": self.case.id + 10},
            ),
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 404)

    def test_request_access_user_has_read_write_access(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"case_id": self.case.id},
            ),
            **self.headers[1],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(AccessRequestNotification.objects.count(), 0)

    def test_request_access_user_is_superuser(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"case_id": self.case.id},
            ),
            **self.headers[4],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(AccessRequestNotification.objects.count(), 0)

    def test_request_access_case_does_not_have_read_write_access(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"case_id": self.case.id},
            ),
            **self.headers[0],
        )

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            AccessRequestNotification.objects.filter(
                user_id=self.users[4].id,
                requesting_user=self.users[0],
                case=self.case,
                message="User user0 has requested access for case case",
            )
        )
        self.assertTrue(
            AccessRequestNotification.objects.filter(
                user_id=self.users[1].id,
                requesting_user=self.users[0],
                case=self.case,
                message="User user0 has requested access for case case",
            )
        )
        self.assertEqual(AccessRequestNotification.objects.count(), 2)

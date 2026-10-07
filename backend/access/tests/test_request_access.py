from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from notifications.models import AccessRequestNotification
from user.models import CradleUser, UserRoles

from ..enums import AccessType
from ..models import Access
from .utils import AccessTestCase


class RequestAccessTest(AccessTestCase):
    def setUp(self):
        super().setUp()

        self.users = [
            CradleUser.objects.create_user(username=f"user{id}", password="user", email=f"b{id}@c.d") for id in range(4)
        ]
        self.users.append(CradleUser.objects.create_superuser(username="admin", password="admin", email="c@d.e"))

        self.entity = Entry.objects.create(name="entity", entry_class=self.entryclass1)

        Access.objects.create(user=self.users[1], entity=self.entity, access_type=AccessType.READ_WRITE)
        Access.objects.create(user=self.users[2], entity=self.entity, access_type=AccessType.READ)
        Access.objects.create(user=self.users[3], entity=self.entity, access_type=AccessType.NONE)

        self.tokens_users = [str(AccessToken.for_user(self.users[id])) for id in range(5)]

        self.headers = [{"HTTP_COOKIE": f"access_token={self.tokens_users[id]}"} for id in range(5)]

    def test_request_access_not_authenticated(self):
        response = self.client.post(
            reverse(
                "request_access",
                kwargs={"entity_id": self.entity.id},
            )
        )

        self.assertEqual(response.status_code, 401)

    def test_request_access_notifies_admins_and_managers(self):
        manager = CradleUser.objects.create_user(
            username="manager", password="user", email="m@c.d", role=UserRoles.MANAGER
        )
        response = self.client.post(
            reverse("request_access", kwargs={"entity_id": self.entity.id}),
            **self.headers[3],
        )

        self.assertEqual(response.status_code, 201)
        self.assertCountEqual(
            AccessRequestNotification.objects.values_list("user_id", flat=True), [self.users[4].id, manager.id]
        )

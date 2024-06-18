from .utils import NotificationsTestCase
from user.models import CradleUser
from entities.models import Entity
from entities.enums import EntityType
from notifications.models import MessageNotification, AccessRequestNotification
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.urls import reverse


class NotificationListTest(NotificationsTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.case = Entity.objects.create(name="Case", type=EntityType.CASE)

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_unread_notifications_not_authenticated(self):
        response = self.client.get(reverse("notification_unread"))

        self.assertEqual(response.status_code, 401)

    def test_unread_notifications_messages(self):
        fields = {"user": self.user, "message": ""}
        MessageNotification.objects.create(
            **fields, is_unread=True, is_marked_unread=False
        )
        MessageNotification.objects.create(
            **fields, is_unread=False, is_marked_unread=True
        )
        MessageNotification.objects.create(
            **fields, is_unread=True, is_marked_unread=True
        )
        MessageNotification.objects.create(
            **fields, is_unread=False, is_marked_unread=False
        )

        response = self.client.get(reverse("notification_unread"), **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)

    def test_unread_notifications_access_request(self):
        fields = {
            "user": self.user,
            "requesting_user": self.user,
            "case": self.case,
            "message": "",
        }
        AccessRequestNotification.objects.create(
            **fields, is_unread=True, is_marked_unread=False
        )
        AccessRequestNotification.objects.create(
            **fields, is_unread=False, is_marked_unread=True
        )
        AccessRequestNotification.objects.create(
            **fields, is_unread=True, is_marked_unread=True
        )
        AccessRequestNotification.objects.create(
            **fields, is_unread=False, is_marked_unread=False
        )

        response = self.client.get(reverse("notification_unread"), **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)

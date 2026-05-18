"""Tests for unread notification count API."""

from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from user.models import CradleUser

from ..models import AccessRequestNotification, MessageNotification
from .utils import NotificationsTestCase


class NotificationUnreadTest(NotificationsTestCase):
    """Tests for GET /notifications/unread-count/."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="alabala@gmail.com",
            is_active=True,
        )
        self.entity = Entry.objects.create(name="Entity", entry_class=self.entryclass1)

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_unread_notifications_not_authenticated(self):
        response = self.client.get(reverse("notification_unread"))

        self.assertEqual(response.status_code, 401)

    def test_unread_notifications_messages(self):
        fields = {"user": self.user, "message": ""}
        MessageNotification.objects.create(**fields, is_unread=True, is_marked_unread=False)
        MessageNotification.objects.create(**fields, is_unread=False, is_marked_unread=True)
        MessageNotification.objects.create(**fields, is_unread=True, is_marked_unread=True)
        MessageNotification.objects.create(**fields, is_unread=False, is_marked_unread=False)

        response = self.client.get(reverse("notification_unread"), **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)

    def test_unread_notifications_access_request(self):
        fields = {
            "user": self.user,
            "requesting_user": self.user,
            "entity": self.entity,
            "message": "",
        }
        AccessRequestNotification.objects.create(**fields, is_unread=True, is_marked_unread=False)
        AccessRequestNotification.objects.create(**fields, is_unread=False, is_marked_unread=True)
        AccessRequestNotification.objects.create(**fields, is_unread=True, is_marked_unread=True)
        AccessRequestNotification.objects.create(**fields, is_unread=False, is_marked_unread=False)

        response = self.client.get(reverse("notification_unread"), **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)

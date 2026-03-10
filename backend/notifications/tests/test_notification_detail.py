"""Tests for notification detail (update) API."""

from uuid import UUID

from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from user.models import CradleUser

from ..models import AccessRequestNotification, MessageNotification
from .utils import NotificationsTestCase


class NotificationDetailTest(NotificationsTestCase):
    """Tests for PUT /notifications/<id>/."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="alabala@gmail.com",
        )
        self.entity = Entry.objects.create(name="Entity", entry_class=self.entryclass1)
        self.message_user = MessageNotification.objects.create(user=self.user, message="Test message")
        self.access_request_user = AccessRequestNotification.objects.create(
            user=self.user,
            requesting_user=self.user,
            entity=self.entity,
            message="Access Request",
        )

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_update_notifications_not_authenticated(self):
        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": self.message_user.id}),
            {"is_marked_unread": True},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_update_notifications_bad_request(self):
        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": self.message_user.id}),
            {"is_marked_unread": "blabla"},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)

    def test_update_notifications_not_found(self):
        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": UUID(int=0)}),
            {"is_marked_unread": True},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_notifications_other_users_notification_returns_404(self):
        other_user = CradleUser.objects.create_user(
            username="other_user",
            password="password",
            is_staff=False,
            email="other@example.com",
        )
        other_notification = MessageNotification.objects.create(
            user=other_user,
            message="Other user message",
        )

        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": other_notification.id}),
            {"is_marked_unread": True},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_notifications_updated_message_notification(self):
        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": self.message_user.id}),
            {"is_marked_unread": True},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 204)

        self.message_user.refresh_from_db()
        self.assertTrue(self.message_user.is_marked_unread)

    def test_update_notifications_updated_access_notification(self):
        response = self.client.put(
            reverse(
                "notification_detail",
                kwargs={"notification_id": self.access_request_user.id},
            ),
            {"is_marked_unread": True},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 204)

        self.access_request_user.refresh_from_db()
        self.assertTrue(self.access_request_user.is_marked_unread)

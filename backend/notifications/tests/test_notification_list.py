"""Tests for notification list API."""

from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from user.models import CradleUser

from ..models import AccessRequestNotification, MessageNotification
from .utils import NotificationsTestCase


class NotificationListTest(NotificationsTestCase):
    """Tests for GET /notifications/."""

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
        self.other_user = CradleUser.objects.create_user(
            username="other_user",
            password="password",
            is_staff=False,
            email="b@c.d",
            is_active=True,
        )
        self.entity = Entry.objects.create(name="Entity", entry_class=self.entryclass1)

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_get_notifications_not_authenticated(self):
        response = self.client.get(reverse("notification_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_notifications_successfully(self):
        message_user = MessageNotification.objects.create(user=self.user, message="Test message")
        MessageNotification.objects.create(user=self.other_user, message="Test message other user")
        access_request_user = AccessRequestNotification.objects.create(
            user=self.user,
            requesting_user=self.other_user,
            entity=self.entity,
            message="Access Request",
        )
        AccessRequestNotification.objects.create(
            user=self.other_user,
            requesting_user=self.user,
            entity=self.entity,
            message="Access Request",
        )

        response = self.client.get(
            reverse("notification_list"),
            **self.headers,
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["total_pages"], 1)
        results = data["results"]

        result_ids = [n["id"] for n in results]
        expected_ids = [str(message_user.id), str(access_request_user.id)]
        self.assertCountEqual(result_ids, expected_ids)

        self.assertTrue(results[0]["timestamp"] >= results[1]["timestamp"])

        self.assertFalse(MessageNotification.objects.filter(user=self.user, is_unread=True).exists())
        self.assertFalse(MessageNotification.objects.filter(user=self.other_user, is_unread=False).exists())

    def test_get_notifications_unread_only_filters_and_preserves_natural_unread(self):
        natural = MessageNotification.objects.create(
            user=self.user,
            message="Natural unread",
            is_unread=True,
            is_marked_unread=False,
        )
        read = MessageNotification.objects.create(
            user=self.user,
            message="Read",
            is_unread=False,
            is_marked_unread=False,
        )
        marked = MessageNotification.objects.create(
            user=self.user,
            message="Marked unread",
            is_unread=False,
            is_marked_unread=True,
        )

        response = self.client.get(
            reverse("notification_list"),
            {"unread_only": "true", "page": 1, "page_size": 20},
            **self.headers,
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 2)
        result_ids = {n["id"] for n in data["results"]}
        self.assertEqual(result_ids, {str(natural.id), str(marked.id)})

        natural.refresh_from_db()
        self.assertTrue(natural.is_unread)
        read.refresh_from_db()
        self.assertFalse(read.is_unread)

        # Default list still clears natural unreads.
        r2 = self.client.get(reverse("notification_list"), **self.headers)
        self.assertEqual(r2.status_code, 200)
        natural.refresh_from_db()
        self.assertFalse(natural.is_unread)

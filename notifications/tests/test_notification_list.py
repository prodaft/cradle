from .utils import NotificationsTestCase
from user.models import CradleUser
from entries.models import Entry
from entries.enums import EntryType
from notifications.models import MessageNotification, AccessRequestNotification
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.urls import reverse


class NotificationListTest(NotificationsTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="alabala@gmail.com",
        )
        self.other_user = CradleUser.objects.create_user(
            username="other_user",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.entity = Entry.objects.create(name="Entity", entry_class=self.entryclass1)

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_get_notifications_not_authenticated(self):
        response = self.client.get(reverse("notification_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_notifications_successfully(self):
        message_user = MessageNotification.objects.create(
            user=self.user, message="Test message"
        )
        MessageNotification.objects.create(
            user=self.other_user, message="Test message other user"
        )
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
        self.assertEqual(len(response.json()), 2)

        expected_response_message_notification = {
            "id": str(message_user.id),
            "message": message_user.message,
            "is_marked_unread": False,
            "timestamp": message_user.timestamp.isoformat().replace("+00:00", "Z"),
            "notification_type": "message_notification",
        }

        expected_response_access_request_notification = {
            "id": str(access_request_user.id),
            "message": access_request_user.message,
            "is_marked_unread": False,
            "notification_type": "request_access_notification",
            "entity_id": str(access_request_user.entity.id),
            "timestamp": access_request_user.timestamp.isoformat().replace(
                "+00:00", "Z"
            ),
            "requesting_user_id": str(access_request_user.requesting_user.id),
        }

        self.assertCountEqual(
            [
                expected_response_access_request_notification,
                expected_response_message_notification,
            ],
            response.json(),
        )

        self.assertTrue(
            response.json()[0]["timestamp"] >= response.json()[1]["timestamp"]
        )

        self.assertFalse(
            MessageNotification.objects.filter(user=self.user, is_unread=True).exists()
        )
        self.assertFalse(
            MessageNotification.objects.filter(
                user=self.other_user, is_unread=False
            ).exists()
        )

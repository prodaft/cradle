from .utils import NotificationsTestCase
from user.models import CradleUser
from entities.models import Entity
from entities.enums import EntityType
from notifications.models import MessageNotification, AccessRequestNotification
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.urls import reverse


class NotificationDetailTest(NotificationsTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.case = Entity.objects.create(name="Case", type=EntityType.CASE)
        self.message_user = MessageNotification.objects.create(
            user=self.user, message="Test message"
        )
        self.access_request_user = AccessRequestNotification.objects.create(
            user=self.user,
            requesting_user=self.user,
            case=self.case,
            message="Access Request",
        )

        self.token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_update_notifications_not_authenticated(self):
        response = self.client.put(
            reverse(
                "notification_detail", kwargs={"notification_id": self.message_user.id}
            ),
            {"is_marked_unread": True},
        )

        self.assertEqual(response.status_code, 401)

    def test_update_notifications_bad_request(self):
        response = self.client.put(
            reverse(
                "notification_detail", kwargs={"notification_id": self.message_user.id}
            ),
            {"is_marked_unread": "blabla"},
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)

    def test_update_notifications_not_found(self):
        response = self.client.put(
            reverse("notification_detail", kwargs={"notification_id": 0}),
            {"is_marked_unread": True},
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_notifications_updated_message_notification(self):
        response = self.client.put(
            reverse(
                "notification_detail", kwargs={"notification_id": self.message_user.id}
            ),
            {"is_marked_unread": True},
            **self.headers,
        )

        self.assertEqual(response.status_code, 200)

        updated_notification = MessageNotification.objects.get(
            user=self.user, message="Test message"
        )
        self.assertTrue(updated_notification.is_marked_unread)

    def test_update_notifications_updated_access_notification(self):
        response = self.client.put(
            reverse(
                "notification_detail",
                kwargs={"notification_id": self.access_request_user.id},
            ),
            {"is_marked_unread": True},
            **self.headers,
        )

        self.assertEqual(response.status_code, 200)

        updated_notification = AccessRequestNotification.objects.get(
            user=self.user, message="Access Request"
        )
        self.assertTrue(updated_notification.is_marked_unread)

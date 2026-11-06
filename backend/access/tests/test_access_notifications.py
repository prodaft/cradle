"""Access requests and changes notify once, with one email per granter and wording that matches the change."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from notifications.models import AccessGrantedNotification, AccessRequestNotification, MessageNotification
from teams.models import Team, TeamAccess, TeamMembership
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import AccessType


class AccessNotificationTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="pw", email="admin@x.y", role=UserRoles.ADMIN
        )
        self.user = CradleUser.objects.create_user(username="user", password="pw", email="user@x.y")
        case = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.first = Entry.objects.create(name="first", entry_class=case)
        self.second = Entry.objects.create(name="second", entry_class=case)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def headers(self, user):
        return {"HTTP_COOKIE": f"access_token={session_access_token(user)}"}


@patch("mail.models.send_email_task.delay")
class AccessRequestNotificationTest(AccessNotificationTestCase):
    def request_access(self, *entities):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(
                reverse("request_entities_access"),
                {"entity_ids": [e.id for e in entities]},
                format="json",
                **self.headers(self.user),
            )

    def test_one_email_per_granter_for_several_entities(self, send):
        response = self.request_access(self.first, self.second)

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(AccessRequestNotification.objects.filter(user=self.admin).count(), 2)
        send.assert_called_once()
        self.assertIn("first", send.call_args.kwargs["body"])
        self.assertIn("second", send.call_args.kwargs["body"])

    def test_asking_again_before_it_is_read_does_not_notify_again(self, send):
        self.request_access(self.first)
        self.request_access(self.first)

        self.assertEqual(AccessRequestNotification.objects.filter(user=self.admin).count(), 1)
        send.assert_called_once()

    def test_asking_again_after_it_was_read_notifies(self, send):
        self.request_access(self.first)
        AccessRequestNotification.objects.update(is_unread=False)
        self.request_access(self.first)

        self.assertEqual(AccessRequestNotification.objects.filter(user=self.admin).count(), 2)
        self.assertEqual(send.call_count, 2)

    def test_unknown_entity_is_not_found(self, send):
        response = self.client.post(
            reverse("request_entities_access"), {"entity_ids": [0]}, format="json", **self.headers(self.user)
        )

        self.assertEqual(response.status_code, 404, response.content)
        send.assert_not_called()


@patch("mail.models.send_email_task.delay")
class AccessUpdateNotificationTest(AccessNotificationTestCase):
    def set_access(self, access_type):
        url = reverse("update_access", kwargs={"entity_id": self.first.id, "user_id": self.user.id})
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.put(url, {"access_type": access_type}, format="json", **self.headers(self.admin))
        self.assertEqual(response.status_code, 200, response.content)

    def test_setting_the_same_access_again_does_not_notify(self, send):
        self.set_access(AccessType.READ)
        self.set_access(AccessType.READ)

        self.assertEqual(AccessGrantedNotification.objects.filter(user=self.user).count(), 1)
        send.assert_called_once()

    def test_removal_is_not_reported_as_a_grant(self, send):
        self.set_access(AccessType.READ)
        send.reset_mock()

        self.set_access(AccessType.NONE)

        self.assertEqual(AccessGrantedNotification.objects.filter(user=self.user).count(), 1)
        removed = MessageNotification.objects.filter(user=self.user, accessgrantednotification__isnull=True)
        self.assertEqual([n.message for n in removed], ['Your access to "first" was removed.'])
        send.assert_not_called()

    def test_change_hidden_by_team_access_is_not_notified(self, send):
        team = Team.objects.create(name="Red")
        TeamMembership.objects.create(team=team, user=self.user)
        TeamAccess.objects.create(team=team, entity=self.first, access_type=AccessType.READ_WRITE)

        self.set_access(AccessType.READ)
        self.set_access(AccessType.NONE)

        self.assertFalse(MessageNotification.objects.filter(user=self.user).exists())
        send.assert_not_called()

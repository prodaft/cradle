"""Long-running admin actions notify the admin who started them when they finish or fail."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from entries.tasks import access_vectors_propagated_task, propagate_all_access_vectors_task
from notifications.models import MessageNotification
from user.models import CradleUser, UserRoles
from user.testing import session_access_token


class ActionNotificationTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="pw", email="a@b.c", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.admin)}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def act(self, action_name):
        url = reverse("perform_action", kwargs={"action_name": action_name})
        return self.client.post(url, **self.headers)

    def messages(self):
        return list(MessageNotification.objects.filter(user=self.admin).values_list("message", flat=True))

    @patch("entries.tasks.refresh_edges_materialized_view.apply_async")
    def test_refresh_notifies_on_success_and_failure(self, apply_async):
        response = self.act("refresh-materialized-graph")

        self.assertEqual(response.status_code, 202, response.content)
        options = apply_async.call_args.kwargs
        self.assertTrue(options["force"])
        self.assertEqual(options["link"].args, (self.admin.id, "Refresh Materialized Graph finished."))
        self.assertIn("failed", options["link_error"].args[1])

    @patch("entries.tasks.propagate_all_access_vectors_task.delay")
    def test_propagate_queues_the_tracked_job(self, delay):
        response = self.act("propagate-access-vectors")

        self.assertEqual(response.status_code, 202, response.content)
        delay.assert_called_once_with(self.admin.id)

    @patch("entries.tasks.chord")
    def test_propagate_waits_on_one_update_per_entity(self, chord):
        entity_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        entities = [Entry.objects.create(name=f"c{i}", entry_class=entity_class) for i in range(2)]

        propagate_all_access_vectors_task(self.admin.id)

        header = list(chord.call_args.args[0])
        self.assertCountEqual([s.args[0] for s in header], [e.id for e in entities])
        self.assertTrue(all(s.kwargs == {"propagate_inline": True} for s in header))
        self.assertEqual(chord.return_value.call_args.args[0].args, (self.admin.id, 2))

    @patch("entries.tasks.refresh_edges_materialized_view")
    def test_propagated_callback_refreshes_graph_then_notifies(self, refresh):
        access_vectors_propagated_task(self.admin.id, 3)

        refresh.assert_called_once_with()
        self.assertEqual(self.messages(), ["Propagate Access Vectors finished for 3 entities."])

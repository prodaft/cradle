"""Shared setup for knowledge graph API tests."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation
from user.models import CradleUser, UserRoles
from user.testing import session_access_token


class GraphTestCase(TestCase):
    """Admin client, a ``case`` entity class, and helpers to build and query the graph."""

    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="password", email="a@c.d", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.admin)}"}
        self.case = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def entity(self, name):
        return Entry.objects.create(name=name, entry_class=self.case)

    def link(self, a, b, content_object=None):
        content_object = content_object or a
        Relation.objects.create(
            e1=a,
            e2=b,
            object_id=content_object.pk,
            content_type=ContentType.objects.get_for_model(content_object),
            reason=RelationReason.NOTE,
            access_vector=1,
        )

    def refresh_edges(self):
        # Postgres now() is frozen at the test transaction's start, so backdate relations to keep edge age positive.
        hour_ago = timezone.now() - timedelta(hours=1)
        Relation.objects.update(created_at=hour_ago, last_seen=hour_ago)
        with connection.cursor() as cursor:
            cursor.execute("REFRESH MATERIALIZED VIEW edges;")

    def get_json(self, url, params=None):
        """GET ``url``; return the JSON body and the number of queries it took."""
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(url, params or {}, **self.headers)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json(), len(queries)

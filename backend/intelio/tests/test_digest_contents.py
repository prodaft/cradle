"""The relations and notes a digest created, as listed on the digest's page."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation
from intelio.models.digest.falcon import FalconDigest
from notes.models import Note
from user.models import CradleUser, UserRoles
from user.testing import session_access_token


class DigestContentsTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="pw", email="admin@example.com", role=UserRoles.ADMIN
        )
        self.owner = CradleUser.objects.create_user(username="owner", password="pw", email="owner@example.com")
        self.other = CradleUser.objects.create_user(username="other", password="pw", email="other@example.com")

        case = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        self.entity = Entry.objects.create(name="PTI-1", entry_class=case)
        self.digest = FalconDigest.objects.create(title="falcon", user=self.owner, summary={"relations_created": 2})
        for value, tag in (("10.0.0.1", "c2"), ("10.0.0.2", "scanner")):
            Relation.objects.create(
                content_object=self.digest,
                e1=self.entity,
                e2=Entry.objects.create(name=value, entry_class=ip),
                access_vector=self.entity.get_acvec(),
                reason=RelationReason.DIGEST,
                details={"tags": [tag]},
            )

        self.note = Note.objects.create(content="# Kit", title="Phishing kit", author=self.owner, digest=self.digest)
        Note.objects.create(content="# Other", title="Not from the digest", author=self.owner)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def get(self, user, name, **params):
        url = reverse(name, kwargs={"digest_id": self.digest.id})
        return self.client.get(url, params, HTTP_COOKIE=f"access_token={session_access_token(user)}")

    def test_detail_includes_summary(self):
        response = self.get(self.owner, "digest_detail")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], {"relations_created": 2})

    def test_admin_lists_relations_with_both_entries(self):
        response = self.get(self.admin, "digest_relations")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        first = response.data["results"][0]
        self.assertEqual(first["src"]["name"], "PTI-1")
        self.assertEqual(first["dst"]["name"], "10.0.0.1")
        self.assertEqual(first["details"], {"tags": ["c2"]})

    def test_search_filters_relations(self):
        response = self.get(self.admin, "digest_relations", search="scanner")
        self.assertEqual([r["dst"]["name"] for r in response.data["results"]], ["10.0.0.2"])

    def test_relations_hidden_without_access_to_their_entity(self):
        response = self.get(self.owner, "digest_relations")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_lists_only_the_digests_notes(self):
        response = self.get(self.owner, "digest_notes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([n["id"] for n in response.data["results"]], [str(self.note.id)])
        self.assertEqual(response.data["results"][0]["created_by"]["username"], "owner")

    def test_search_filters_notes(self):
        response = self.get(self.owner, "digest_notes", search="nothing-matches")
        self.assertEqual(response.data["count"], 0)

    def test_other_users_digest_is_not_found(self):
        for name in ("digest_relations", "digest_notes"):
            with self.subTest(name=name):
                self.assertEqual(self.get(self.other, name).status_code, 404)

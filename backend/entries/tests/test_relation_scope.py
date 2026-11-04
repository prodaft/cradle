"""Artifact pairs may be linked when an entity's access scopes the link; duplicates can be cleaned up."""

from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.management import CommandError, call_command
from django.test import TestCase
from django.utils import timezone

from intelio.models.digest.falcon import FalconDigest
from intelio.models.mappings.falcon import FalconMapping
from user.models import CradleUser, UserRoles

from ..enums import EntryType, RelationReason
from ..models import Attachment, Entry, EntryClass, Relation


class RelationScopeTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(username="user", password="pw", email="u@x.y")
        ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        domain = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="domain")
        case = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.ip = Entry.objects.create(name="1.1.1.1", entry_class=ip)
        self.domain = Entry.objects.create(name="a.example", entry_class=domain)
        self.case = Entry.objects.create(name="PTI-1", entry_class=case)
        self.digest = FalconDigest.objects.create(user=self.user, title="d", digest_type="FalconDigest")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def relation(self, e1, e2, access_vector, **kwargs):
        return Relation(
            e1=e1,
            e2=e2,
            content_object=self.digest,
            reason=RelationReason.DIGEST,
            access_vector=access_vector,
            **kwargs,
        )


class RelationScopeTest(RelationScopeTestCase):
    def test_artifacts_scoped_by_an_entity_can_be_linked(self):
        self.relation(self.ip, self.domain, self.case.get_acvec()).save()
        Relation.objects.bulk_create([self.relation(self.domain, self.ip, self.case.get_acvec())])

        self.assertEqual(Relation.objects.count(), 2)

    def test_unscoped_artifact_link_is_rejected(self):
        with self.assertRaises(ValidationError):
            self.relation(self.ip, self.domain, 1).save()
        with self.assertRaises(ValidationError):
            Relation.objects.bulk_create([self.relation(self.ip, self.domain, 1)])

    def test_entity_link_needs_no_entity_bit(self):
        self.relation(self.ip, self.case, 1).save()

        self.assertEqual(Relation.objects.count(), 1)


class FalconDuplicateTest(RelationScopeTestCase):
    def test_repeated_links_are_stored_once(self):
        at = timezone.now()
        acvec = self.case.get_acvec()

        def batch():
            return [
                self.relation(self.ip, self.domain, acvec, created_at=at, details={"tags": ["c2"]}),
                self.relation(self.domain, self.ip, acvec, created_at=at, details={"tags": ["c2"]}),
                self.relation(self.ip, self.domain, acvec, created_at=at, details={"tags": ["phishing"]}),
            ]

        self.digest._save_relations(batch())
        self.digest._save_relations(batch())  # the chunk runs again

        tags = sorted(r.details["tags"][0] for r in Relation.objects.all())
        self.assertEqual(tags, ["c2", "phishing"])

    def test_unscoped_links_are_dropped(self):
        self.digest._save_relations([self.relation(self.ip, self.domain, 1)])

        self.assertFalse(Relation.objects.exists())


class FalconDigestLinksTest(RelationScopeTestCase):
    def test_indicator_links_are_kept_and_scoped_to_the_entity(self):
        admin = CradleUser.objects.create_user(username="boss", password="pw", email="b@x.y", role=UserRoles.ADMIN)
        digest = FalconDigest.objects.create(user=admin, title="falcon", digest_type="FalconDigest")
        FalconMapping.objects.create(type="actor", internal_class=self.case.entry_class)
        FalconMapping.objects.create(type="ipv4", internal_class=self.ip.entry_class)
        FalconMapping.objects.create(type="domain", internal_class=self.domain.entry_class)
        item = {
            "entity": {"type": "actor", "value": "PTI-1"},
            "type": "ipv4",
            "value": "1.1.1.1",
            "links": [{"type": "domain", "value": "a.example"}],
        }

        with patch.object(FalconDigest, "digest_data", return_value=[item]):
            digest.digest_chunk(0, 1)

        links = {(r.e1_id, r.e2_id): r.access_vector for r in Relation.objects.filter(object_id=digest.id)}
        pair = tuple(sorted((self.ip.id, self.domain.id)))
        self.assertEqual(links[pair], self.case.get_acvec())
        self.assertIn(tuple(sorted((digest.entry.id, self.ip.id))), links)
        self.assertIn(tuple(sorted((digest.entry.id, self.case.id))), links)


@patch("entries.management.commands.delete_duplicate_relations.refresh_edges_materialized_view")
class DeleteDuplicateRelationsTest(RelationScopeTestCase):
    def setUp(self):
        super().setUp()
        at = timezone.now() - timedelta(days=1)
        acvec = self.case.get_acvec()
        Relation.objects.bulk_create(
            [self.relation(self.ip, self.domain, acvec, created_at=at, details={"tags": ["c2"]}) for _ in range(3)]
            + [self.relation(self.ip, self.domain, acvec, created_at=at, details={"tags": ["other"]})]
        )

    def run_command(self, *args):
        out = StringIO()
        call_command("delete_duplicate_relations", *args, stdout=out)
        return out.getvalue()

    def test_dry_run_only_reports(self, refresh):
        output = self.run_command("--dry-run")

        self.assertIn("2 duplicate relation(s) found.", output)
        self.assertEqual(Relation.objects.count(), 4)
        refresh.assert_not_called()

    def test_deletes_exact_copies_only_then_refreshes(self, refresh):
        self.run_command("--batch-size", "1")

        self.assertEqual(sorted(r.details["tags"][0] for r in Relation.objects.all()), ["c2", "other"])
        refresh.assert_called_once_with()

    def test_batch_size_must_be_positive(self, refresh):
        with self.assertRaises(CommandError):
            self.run_command("--batch-size", "0")

        self.assertEqual(Relation.objects.count(), 4)

    def test_copies_with_attachments_are_kept(self, refresh):
        for relation in Relation.objects.filter(details__tags=["c2"])[:2]:
            Attachment.objects.create(relation=relation, name="a.txt", file="a.txt", type="text/plain")

        self.run_command()

        self.assertEqual(Relation.objects.filter(details__tags=["c2"]).count(), 2)
        self.assertEqual(Attachment.objects.count(), 2)

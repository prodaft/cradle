from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.exceptions import PermissionDeniedException
from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation
from intelio.models.base import EnricherSettings, EnrichmentRequest
from intelio.serializers import EnrichmentRequestEnricherSerializer, EnrichmentRequestSerializer
from user.models import CradleUser, UserRoles


class EnrichmentRequestSerializerTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="admin", password="password", email="a@x.y", role=UserRoles.ADMIN
        )
        request = APIRequestFactory().post("/")
        request.user = self.user
        self.context = {"request": request}
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        entity_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.entity = Entry.objects.create(name="c1", entry_class=entity_class)
        EnricherSettings.objects.create(enricher_type="X", enabled=True)
        self.data = {
            "title": "t",
            "enricher_names": ["X"],
            "artifact": {"entry_class": "ip", "name": "1.1.1.1"},
            "entity_ids": [self.entity.id],
        }

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_entity_ids_scope_the_request(self):
        serializer = EnrichmentRequestSerializer(data=self.data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with patch("intelio.models.base.EnrichmentRequest.start_enrichment"):
            enrichment_request = serializer.save()

        data = EnrichmentRequestSerializer(enrichment_request, context=self.context).data
        self.assertEqual([e["id"] for e in data["entities"]], [self.entity.id])
        self.assertNotIn("entity_ids", data)

    def test_entity_ids_require_write_access(self):
        with patch("intelio.serializers.Access.objects.has_access_to_entities", return_value=False):
            serializer = EnrichmentRequestSerializer(data=self.data, context=self.context)
            with self.assertRaises(PermissionDeniedException):
                serializer.is_valid(raise_exception=True)


class EnricherResultsTest(TestCase):
    """One enricher's results on a request: its artifact, relation count, warnings and errors."""

    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        user = CradleUser.objects.create_user(username="admin", password="pw", email="a@x.y", role=UserRoles.ADMIN)
        ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="file")
        case = Entry.objects.create(
            name="c1", entry_class=EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        )
        self.artifact = Entry.objects.create(name="1.1.1.1", entry_class=ip)
        Entry.objects.create(name="2.2.2.2", entry_class=ip)
        for enricher_type in ("A", "B"):
            EnricherSettings.objects.create(enricher_type=enricher_type).for_eclasses.add(ip)

        self.request = EnrichmentRequest.objects.create(
            title="t",
            user=user,
            artifact={"entry_class": "ip", "name": "1.1.1.1"},
            warnings={"A": ["slow"]},
            errors={"B": ["failed"]},
        )
        self.request.enrichers_settings.set(EnricherSettings.objects.all())
        Relation.objects.bulk_create(
            [
                Relation(
                    content_object=self.request,
                    e1=self.artifact,
                    e2=case,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=enricher_type,
                )
                for enricher_type in ("A", "A", "B")
            ]
        )

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def results(self, enricher_type):
        return EnrichmentRequestEnricherSerializer.for_enrichment(self.request, enricher_type).data

    def test_counts_only_this_enrichers_relations(self):
        self.assertEqual([(a["name"], a["count"]) for a in self.results("A")["artifacts"]], [("1.1.1.1", 2)])
        self.assertEqual([a["count"] for a in self.results("B")["artifacts"]], [1])

    def test_returns_this_enrichers_warnings_and_errors(self):
        self.assertEqual((self.results("A")["warnings"], self.results("A")["errors"]), (["slow"], []))
        self.assertEqual((self.results("B")["warnings"], self.results("B")["errors"]), ([], ["failed"]))

    def test_artifact_the_enricher_does_not_handle_lists_nothing(self):
        self.request.artifact = {"entry_class": "file", "name": "sample.bin"}
        self.request.save()
        self.assertEqual(self.results("A")["artifacts"], [])

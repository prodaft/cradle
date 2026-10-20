from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.exceptions import PermissionDeniedException
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from intelio.models.base import EnricherSettings
from intelio.serializers import EnrichmentRequestSerializer
from user.models import CradleUser, UserRoles


class EnrichmentRequestSerializerTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
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

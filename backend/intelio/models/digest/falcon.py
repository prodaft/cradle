from datetime import datetime
from django.utils import timezone
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.exceptions import InvalidEntryException
from entries.models import Entry
from intelio.enums import DigestStatus
from notes.utils import calculate_acvec
from ...tasks.falcon import digest_chunk
from ..mappings.falcon import FalconMapping
from ..base import BaseDigest
from entries.models import Relation
from entries.enums import RelationReason
from entries.models import EntryClass
import json


class FalconDigest(BaseDigest):
    display_name = "Falcon"

    infer_entities = True

    class Meta:
        proxy = True

    def _digest(self):
        with open(self.path, "r") as report_file:
            try:
                report_data = json.load(report_file)
            except json.JSONDecodeError as e:
                self.status = DigestStatus.ERROR
                self.errors = ["Invalid JSON format: " + e.msg]
                self.save()
                return

        if not isinstance(report_data, list):
            self.status = DigestStatus.ERROR
            self.errors = ["Expected a list of falcon objects"]
            self.save()
            return

        for k, i in enumerate(report_data):
            digest_chunk.delay(self.id, i, k == len(report_data) - 1)

    def digest_chunk(self, obj):
        typemapping: dict[EntryClass, FalconMapping] = FalconMapping.get_typemapping()

        entity_obj = obj.get("entity", None)

        if entity_obj is None:
            self._append_warning("Entity fields missing")
            return

        eclass = typemapping.get(entity_obj.get("type"), None).type

        if eclass is None:
            self._append_warning(f"Unknown type {entity_obj.get('type')}")
            return

        entity = Entry.entities.filter(
            entry_class=eclass,
            name=entity_obj.get("value"),
        ).first()

        if entity is None or not Access.objects.has_access_to_entities(
            self.user, [entity], [AccessType.READ_WRITE]
        ):
            self._append_error(
                f"Entity {entity_obj.get('type')}:{entity_obj.get('value')} not found or you don't have access."
            )
            return

        eclass = typemapping.get(obj.get("type"), None).type

        if eclass is None:
            self._append_warning(f"Unknown type {obj.get('type')}")
            return

        if eclass.type != EntryType.ARTIFACT:
            self._append_warning(f"You can't link to an entity ({eclass.subtype})!")
            return

        value = obj.get("value", None)

        if value is None:
            self._append_warning("Entity value missing")
            return

        parent_entry, created = Entry.objects.get_or_create(
            entry_class=eclass,
            name=value,
        )

        # Get and parse unix timestamp with current timezone
        timestamp = obj.get("timestamp", None)

        if timestamp is not None:
            timestamp = datetime.fromtimestamp(
                timestamp, tz=timezone.get_current_timezone()
            )
        else:
            timestamp = timezone.now()

        access_vector = calculate_acvec(
            [
                parent_entry,
                entity,
            ]
        )

        rels = [
            Relation(
                content_object=self,
                e1=entity,
                e2=parent_entry,
                access_vector=access_vector,
                created_at=timestamp,
                reason=RelationReason.DIGEST,
                details={"tags": obj.get("tags", None), "title": self.title},
            )
        ]

        for link in obj.get("links", []):
            eclass = typemapping.get(link.get("type"), None).type
            if eclass is None:
                self._append_warning(f"Unknown type {link.get('type')}")
                continue

            if eclass.type != EntryType.ARTIFACT:
                self._append_warning(f"You can't link to an entity ({eclass.subtype})!")
                continue

            value = link.get("value", None)
            if value is None:
                self._append_warning("Link value missing")
                continue

            try:
                child_entry, created = Entry.objects.get_or_create(
                    entry_class=eclass,
                    name=value,
                )
            except InvalidEntryException as e:
                self._append_warning(e.detail)
                continue

            rels.append(
                Relation(
                    content_object=self,
                    e1=parent_entry,
                    e2=child_entry,
                    access_vector=access_vector,
                    created_at=timestamp,
                    reason=RelationReason.DIGEST,
                    details={"tags": obj.get("tags", None), "title": self.title},
                )
            )

        # Save all relations in bulk for performance
        Relation.objects.bulk_create(rels)

        self.save()

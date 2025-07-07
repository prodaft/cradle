from datetime import datetime
from django.utils import timezone
from django.db import IntegrityError
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.exceptions import InvalidEntryException
from entries.models import Entry
from intelio.enums import DigestStatus
from notes.utils import calculate_acvec
from celery import chain
from ...tasks.falcon import digest_chunk
from ..mappings.falcon import FalconMapping
from ..base import BaseDigest
from entries.models import Relation
from entries.enums import RelationReason
from entries.models import EntryClass
import json

CHUNK_SIZE = 1000  # Number of objects to process in each chunk
REL_CHUNK_SIZE = 4000  # Number of relations to save in each chunk


class FalconDigest(BaseDigest):
    display_name = "Falcon"

    infer_entities = True

    class Meta:
        proxy = True

    def digest_data(self):
        with open(self.path, "r") as report_file:
            report_data = json.load(report_file)

        if not isinstance(report_data, list):
            raise ValueError("Expected a list of falcon objects")

        return report_data

    def _digest(self):
        print(self.status)
        try:
            report_data = self.digest_data()
        except json.JSONDecodeError as e:
            self.status = DigestStatus.ERROR
            self.errors = ["Invalid JSON format: " + e.msg]
            self.save()
            return
        except ValueError:
            self.status = DigestStatus.ERROR
            self.errors = ["Expected a list of falcon objects"]
            self.save()
            return

        chunks = []
        for k in range(0, len(report_data), CHUNK_SIZE):
            chunks.append(
                digest_chunk.si(
                    self.id,
                    k,
                    min(len(report_data), k + CHUNK_SIZE),
                    k + CHUNK_SIZE >= len(report_data),
                )
            )

        if chunks:
            self.status = DigestStatus.WORKING
            self.save()

            chain(*chunks).apply_async()

        return True

    def digest_chunk(self, start, end):
        rels = []
        typemapping: dict[str, EntryClass] = FalconMapping.get_typemapping_rev()
        entities = {}

        for obj in self.digest_data()[start:end]:
            entity_obj = obj.get("entity", None)

            if entity_obj is None:
                self._append_warning("Entity fields missing")
                return

            if f"{entity_obj.get('type')}:{entity_obj.get('value')}" not in entities:
                eclass = typemapping.get(entity_obj.get("type"))

                if eclass is None:
                    self._append_warning(f"Unknown type {entity_obj.get('type')}")
                    continue

                entity = Entry.entities.filter(
                    entry_class=eclass,
                    name=entity_obj.get("value"),
                ).first()

                if entity is None or not Access.objects.has_access_to_entities(
                    self.user, [entity], [AccessType.READ_WRITE]
                ):
                    self._append_warning(
                        f"Entity {entity_obj.get('type')}:{entity_obj.get('value')} not found or you don't have access."
                    )
                    continue

                entities[f"{entity_obj.get('type')}:{entity_obj.get('value')}"] = entity
            else:
                entity = entities[f"{entity_obj.get('type')}:{entity_obj.get('value')}"]

            eclass = typemapping.get(obj.get("type"), None)

            if eclass is None:
                self._append_warning(f"Unknown type {obj.get('type')}")
                continue

            if eclass.type != EntryType.ARTIFACT:
                self._append_warning(f"You can't link to an entity ({eclass.subtype})!")
                continue

            value = obj.get("value", None)

            if value is None:
                self._append_warning("Entity value missing")
                return

            if len(value) > 1024:
                self._append_warning(
                    f"Entity value {value} is too long ({len(value)} characters, max 1024)."
                )
                continue

            try:
                parent_entry, created = Entry.objects.get_or_create(
                    entry_class=eclass,
                    name=value,
                )
            except InvalidEntryException as e:
                self._append_warning(e.detail)
                continue
            except IntegrityError:
                try:
                    parent_entry = Entry.objects.get(
                        entry_class=eclass,
                        name=value,
                    )
                except Entry.DoesNotExist:
                    self._append_warning(
                        f"Entry {eclass.subtype} with name {value} already exists, but could not be retrieved."
                    )
                    continue

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

            rels.append(
                Relation(
                    content_object=self,
                    e1=entity,
                    e2=parent_entry,
                    access_vector=access_vector,
                    created_at=timestamp,
                    reason=RelationReason.DIGEST,
                    details={"tags": obj.get("tags", None), "title": self.title},
                )
            )

            for link in obj.get("links", []):
                eclass = typemapping.get(link.get("type"), None)
                if eclass is None:
                    self._append_warning(f"Unknown type {link.get('type')}")
                    continue

                if eclass.type != EntryType.ARTIFACT:
                    self._append_warning(
                        f"You can't link to an entity ({eclass.subtype})!"
                    )
                    continue

                value = link.get("value", None)
                if value is None:
                    self._append_warning("Link value missing")
                    continue

                if len(value) > 1024:
                    self._append_warning(
                        f"Entity value {value} is too long ({len(value)} characters, max 1024)."
                    )
                    continue

                try:
                    child_entry, created = Entry.objects.get_or_create(
                        entry_class=eclass,
                        name=value,
                    )
                except InvalidEntryException as e:
                    self._append_warning(e.detail)
                    continue
                except IntegrityError:
                    try:
                        child_entry = Entry.objects.get(
                            entry_class=eclass,
                            name=value,
                        )
                    except Entry.DoesNotExist:
                        self._append_warning(
                            f"Entry {eclass.subtype} with name {value} already exists, but could not be retrieved."
                        )
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

                if len(rels) >= REL_CHUNK_SIZE:
                    Relation.objects.bulk_create(rels)
                    rels = []

            if len(rels) >= REL_CHUNK_SIZE:
                Relation.objects.bulk_create(rels)
                rels = []

        if len(rels) > 0:
            # Save all relations in bulk for performance
            Relation.objects.bulk_create(rels)

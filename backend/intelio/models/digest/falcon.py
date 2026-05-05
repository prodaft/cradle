import json
import logging
from datetime import datetime

from celery import chain
from django.db import IntegrityError
from django.utils import timezone

from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType, RelationReason
from entries.exceptions import InvalidEntryException
from entries.models import Entry, EntryClass, Relation

from ...constants import INTELIO_FALCON_DIGEST_CHUNK_SIZE, INTELIO_FALCON_DIGEST_REL_CHUNK_SIZE
from ...enums import DigestStatus
from ...tasks.falcon import digest_chunk
from ..base import BaseDigest
from ..mappings.falcon import FalconMapping

logger = logging.getLogger(__name__)


class FalconDigest(BaseDigest):
    """Digest for Falcon threat intelligence JSON exports (entities and relations)."""

    display_name = "Falcon"
    infer_entities = True

    class Meta:
        proxy = True

    def digest_data(self):
        """Load and return Falcon JSON data from the digest file."""
        self.ensure_local_file()
        with open(self.path, "r") as report_file:
            report_data = json.load(report_file)

        if not isinstance(report_data, list):
            raise ValueError("The file must contain a list of items.")

        return report_data

    def _digest(self):
        """Split Falcon data into chunks and schedule Celery tasks for processing."""
        try:
            report_data = self.digest_data()
        except json.JSONDecodeError:
            self.status = DigestStatus.ERROR
            self.errors = ["The file contains invalid JSON."]
            self.save()
            return
        except ValueError:
            self.status = DigestStatus.ERROR
            self.errors = ["The file must contain a list of items."]
            self.save()
            return

        chunks = []
        for k in range(0, len(report_data), INTELIO_FALCON_DIGEST_CHUNK_SIZE):
            chunks.append(
                digest_chunk.si(
                    self.id,
                    k,
                    min(len(report_data), k + INTELIO_FALCON_DIGEST_CHUNK_SIZE),
                    k + INTELIO_FALCON_DIGEST_CHUNK_SIZE >= len(report_data),
                )
            )

        if chunks:
            self.status = DigestStatus.WORKING
            self.save()

            chain(*chunks).apply_async()

    def digest_chunk(self, start, end):
        """Process a slice of Falcon objects, creating entries and relations."""
        rels = []
        typemapping: dict[str, EntryClass] = FalconMapping.get_typemapping_rev()
        digest_entry = self.entry
        entities = {}

        for obj in self.digest_data()[start:end]:
            entity_obj = obj.get("entity", None)

            if entity_obj is None:
                self._append_warning("Required entity information is missing from this item.")
                continue

            if f"{entity_obj.get('type')}:{entity_obj.get('value')}" not in entities:
                eclass = typemapping.get(entity_obj.get("type"))

                if eclass is None:
                    logger.warning(
                        "Unknown Falcon digest entity type (not in mapping): %s",
                        entity_obj.get("type"),
                    )
                    self._append_warning("This item uses a type that is not mapped in settings.")
                    continue

                entity = Entry.entities.filter(
                    entry_class=eclass,
                    name=entity_obj.get("value"),
                ).first()

                if entity is None or not Access.objects.has_access_to_entities(
                    self.user, {entity}, {AccessType.READ_WRITE}
                ):
                    logger.warning(
                        "Falcon digest entity not found or inaccessible: %s:%s",
                        entity_obj.get("type"),
                        entity_obj.get("value"),
                    )
                    self._append_warning("A referenced entity could not be found or is not accessible.")
                    continue

                entities[f"{entity_obj.get('type')}:{entity_obj.get('value')}"] = entity
            else:
                entity = entities[f"{entity_obj.get('type')}:{entity_obj.get('value')}"]

            eclass = typemapping.get(obj.get("type"), None)

            if eclass is None:
                logger.warning("Unknown Falcon digest object type (not in mapping): %s", obj.get("type"))
                self._append_warning("This item uses a type that is not mapped in settings.")
                continue

            if eclass.type != EntryType.ARTIFACT:
                st = str(eclass.subtype)
                label = st.replace("_", " ").strip() or st
                self._append_warning(
                    f'This digest can only link artifact entries. The type "{label}" is not an artifact.'
                )
                continue

            value = obj.get("value", None)

            if value is None:
                self._append_warning("A value is missing for this item.")
                continue

            if len(value) > 1024:
                logger.warning("Falcon digest entity value exceeds max length (%s chars)", len(value))
                self._append_warning("A value in this item is too long (maximum 1024 characters).")
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
                    logger.warning(
                        "Falcon digest: duplicate entry exists but could not be loaded (%s)",
                        eclass.subtype,
                    )
                    self._append_warning(
                        "This entry already exists but could not be loaded. Try re-running the import later."
                    )
                    continue

            # Get and parse unix timestamp with current timezone
            timestamp = obj.get("timestamp", None)

            if timestamp is not None:
                timestamp = datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone())
            else:
                timestamp = timezone.now()

            rels.append(
                Relation(
                    content_object=self,
                    e1=digest_entry,
                    e2=parent_entry,
                    access_vector=entity.get_acvec(),
                    created_at=timestamp,
                    reason=RelationReason.DIGEST,
                    details={"tags": obj.get("tags", None), "title": self.title},
                )
            )

            for link in obj.get("links", []):
                eclass = typemapping.get(link.get("type"), None)
                if eclass is None:
                    logger.warning(
                        "Unknown Falcon digest link type (not in mapping): %s",
                        link.get("type"),
                    )
                    self._append_warning("This item uses a type that is not mapped in settings.")
                    continue

                if eclass.type != EntryType.ARTIFACT:
                    st = str(eclass.subtype)
                    label = st.replace("_", " ").strip() or st
                    self._append_warning(
                        f'This digest can only link artifact entries. The type "{label}" is not an artifact.'
                    )
                    continue

                value = link.get("value", None)
                if value is None:
                    self._append_warning("A value is missing for this link.")
                    continue

                if len(value) > 1024:
                    logger.warning("Falcon digest link value exceeds max length (%s chars)", len(value))
                    self._append_warning("A value in this item is too long (maximum 1024 characters).")
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
                        logger.warning(
                            "Falcon digest: duplicate entry exists but could not be loaded (%s)",
                            eclass.subtype,
                        )
                        self._append_warning(
                            "This entry already exists but could not be loaded. Try re-running the import later."
                        )
                        continue

                rels.append(
                    Relation(
                        content_object=self,
                        e1=parent_entry,
                        e2=child_entry,
                        access_vector=entity.get_acvec(),
                        created_at=timestamp,
                        reason=RelationReason.DIGEST,
                        details={"tags": obj.get("tags", None), "title": self.title},
                    )
                )

                if len(rels) >= INTELIO_FALCON_DIGEST_REL_CHUNK_SIZE:
                    to_save = [r for r in rels if Relation.includes_entity(r.e1, r.e2)]
                    if to_save:
                        Relation.objects.bulk_create(to_save)
                    rels = []

            if len(rels) >= INTELIO_FALCON_DIGEST_REL_CHUNK_SIZE:
                to_save = [r for r in rels if Relation.includes_entity(r.e1, r.e2)]
                if to_save:
                    Relation.objects.bulk_create(to_save)
                rels = []

        if len(rels) > 0:
            to_save = [r for r in rels if Relation.includes_entity(r.e1, r.e2)]
            if to_save:
                Relation.objects.bulk_create(to_save)

        rels = [
            Relation(
                content_object=self,
                e1=digest_entry,
                e2=entity,
                access_vector=entity.get_acvec(),
                created_at=timezone.now(),
                reason=RelationReason.DIGEST,
            )
            for entity in entities.values()
        ]

        to_save = [r for r in rels if Relation.includes_entity(r.e1, r.e2)]
        if to_save:
            Relation.objects.bulk_create(to_save)
        if entities:
            self.entities.add(*entities.values())

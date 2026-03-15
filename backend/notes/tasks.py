"""Celery tasks for note processing: linking, population, metadata, access vectors."""

import json
import logging

from celery import shared_task
from django.contrib.contenttypes.models import ContentType
from django.core.serializers.json import DjangoJSONEncoder
from django.db import close_old_connections, transaction
from django.db.models import Count, Q
from django.utils import timezone

from core.decorators import distributed_lock
from entries.constants import (
    INTERNAL_ENTRY_CLASS_DEFAULTS,
    SUBTYPE_ALIAS,
    SUBTYPE_FILE,
    SUBTYPE_NOTE,
)
from entries.enums import EntryType, RelationReason
from entries.exceptions import InvalidEntryException
from entries.models import Entry, EntryClass, Relation
from management.settings import cradle_settings
from user.models import CradleUser

from .enums import NoteStatus
from .exceptions import EntriesDoNotExistException, EntryClassesDoNotExistException
from .markdown.to_links import Link
from .markdown.to_metadata import infer_metadata
from .models import Note

logger = logging.getLogger(__name__)


@shared_task
@distributed_lock("smartlinker_note_{note_id}", timeout=1800)
def smart_linker_task(note_id, user_id=None):
    """Create links between entries for a note from its reference tree.

    Args:
        note_id: ID of the Note object to process.
        user_id: ID of the user performing the action (optional, for logging).
    """
    from entries.tasks import refresh_edges_materialized_view

    note = Note.objects.get(id=note_id)

    try:
        Relation.objects.filter(note=note, reason=RelationReason.NOTE).delete()

        pairs = note.reference_tree.get_relation_tuples()
        pairs_resolved = set()

        entries = {}
        for e in note.entries.all():
            entries[Link(e.entry_class.subtype, e.name)] = e

        # Resolve pairs from reference tree
        for src, dst in pairs:
            if src in entries and dst in entries:
                if (
                    src.date and dst.date and src.date != dst.date
                ):  # If both have dates, and they are different, two relations with both dates are created
                    pairs_resolved.add(
                        (
                            entries[src],
                            entries[dst],
                            src.virtual or dst.virtual,
                            dst.date,
                        )
                    )

                pairs_resolved.add(
                    (
                        entries[src],
                        entries[dst],
                        src.virtual or dst.virtual,
                        src.date or dst.date,
                    )
                )
            else:
                logger.warning(f"Pair ({src}, {dst}) not found in entries. Skipping this pair.")

        # Bulk create relations
        Relation.objects.bulk_create(
            [
                Relation(
                    e1=src,
                    e2=dst,
                    content_object=note,
                    access_vector=note.access_vector,
                    virtual=virtual,
                    reason=RelationReason.NOTE,
                    created_at=date if date else timezone.now(),
                    last_seen=date if date else timezone.now(),
                )
                for src, dst, virtual, date in pairs_resolved
            ]
        )

        note.last_linked = timezone.now()
        note.save()

    finally:
        close_old_connections()
        refresh_edges_materialized_view.apply_async()

    return note_id


@shared_task
@distributed_lock("link_files_note_{note_id}", timeout=1800)
def link_files_task(note_id, file_ref_id=None):
    """Link file references in a note to entries (hashes, entities).

    Args:
        note_id: ID of the Note object to process.
        file_ref_id: Optional specific file reference ID; if omitted, all files are processed.
    """
    from entries.tasks import refresh_edges_materialized_view

    note = Note.objects.get(id=note_id)

    md5_subclass = cradle_settings.files.md5_subtype
    sha256_subclass = cradle_settings.files.sha256_subtype
    sha1_subclass = cradle_settings.files.sha1_subtype

    md5_et = EntryClass.objects.filter(type=EntryType.ARTIFACT, subtype=md5_subclass).first() if md5_subclass else None
    sha256_et = (
        EntryClass.objects.filter(type=EntryType.ARTIFACT, subtype=sha256_subclass).first() if sha256_subclass else None
    )
    sha1_et = (
        EntryClass.objects.filter(type=EntryType.ARTIFACT, subtype=sha1_subclass).first() if sha1_subclass else None
    )

    relations = []
    if file_ref_id is None:
        files = note.files.all()
    else:
        file_ref = note.files.filter(id=file_ref_id).first()
        if not file_ref:
            logger.warning(f"File reference with ID {file_ref_id} not found in note {note_id}.")
            return note_id

        files = [file_ref]

    for f in files:
        note.entries.add(f.entry)

        for e in f.entities:
            relations.append(
                Relation(
                    e1=e,
                    e2=f.entry,
                    content_object=note,
                    access_vector=note.access_vector,
                    reason=RelationReason.NOTE,
                    virtual=True,
                )
            )

        hashes = []
        if f.md5_hash and md5_et:
            entry, _ = Entry.objects.get_or_create(name=f.md5_hash, entry_class=md5_et)
            note.entries.add(entry)
            hashes.append(entry)

        if f.sha256_hash and sha256_et:
            entry, _ = Entry.objects.get_or_create(name=f.sha256_hash, entry_class=sha256_et)
            note.entries.add(entry)
            hashes.append(entry)

        if f.sha1_hash and sha1_et:
            entry, _ = Entry.objects.get_or_create(name=f.sha1_hash, entry_class=sha1_et)
            note.entries.add(entry)
            hashes.append(entry)

        for h in hashes:
            relations.append(
                Relation(
                    e1=h,
                    e2=f.entry,
                    content_object=note,
                    access_vector=note.access_vector,
                    reason=RelationReason.ENRICHMENT,
                    virtual=True,
                )
            )

    if relations:
        Relation.objects.bulk_create(relations)
        refresh_edges_materialized_view.apply_async()

    return note_id


@shared_task(autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=60, max_retries=1)
def entry_class_creation_task(note_id, user_id=None):
    """Create missing entry classes referenced by a note.

    Args:
        note_id: ID of the Note object to process.
        user_id: ID of the user performing the action (optional, for logging).
    """
    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    EntryClass.objects.get_or_create(subtype=SUBTYPE_NOTE, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_NOTE])
    EntryClass.objects.get_or_create(subtype=SUBTYPE_FILE, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_FILE])

    try:
        unique_subtypes = {r.key for r in note.reference_tree.all_links()}
        existing = set(EntryClass.objects.filter(subtype__in=unique_subtypes).values_list("subtype", flat=True))
        missing = unique_subtypes - existing

        nonexistent_entries = set()
        for subtype in missing:
            if not cradle_settings.notes.allow_dynamic_entry_class_creation:
                nonexistent_entries.add(subtype)
            else:
                entry = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype=subtype)
                if user_id:
                    entry.log_create(user)

        if nonexistent_entries:
            raise EntryClassesDoNotExistException(nonexistent_entries)
    except EntryClassesDoNotExistException as e:
        note.set_status(NoteStatus.INVALID, e.detail)
        note.save()

        raise e


@shared_task(autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3)
def entry_population_task(note_id, user_id=None):
    """Create missing entries for a note from its reference tree.

    Args:
        note_id: ID of the Note object to process.
        user_id: ID of the user performing the action (optional, for logging).
    """
    from entries.tasks import scan_for_children

    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    try:
        with transaction.atomic():
            note.entries.clear()

            links = list(note.reference_tree.all_links())
            unique_keys = {(r.key, r.value) for r in links}

            # Batch fetch existing entries
            if unique_keys:
                entry_conditions = Q()
                for key, value in unique_keys:
                    entry_conditions |= Q(entry_class__subtype=key, name=value)
                existing = {
                    (e.entry_class.subtype, e.name): e
                    for e in Entry.objects.filter(entry_conditions).select_related("entry_class")
                }
                entry_classes = {
                    ec.subtype: ec for ec in EntryClass.objects.filter(subtype__in={k for k, _ in unique_keys})
                }
            else:
                existing = {}
                entry_classes = {}

            entries = []
            entries_to_add = []
            for r in links:
                key = (r.key, r.value)
                if key in existing:
                    entries_to_add.append(existing[key])
                    continue
                ec = entry_classes.get(r.key)
                if not ec:
                    if cradle_settings.notes.allow_dynamic_entry_class_creation:
                        continue
                    logger.warning(f"Entry class {r.key} does not exist. Skipping entry creation.")
                    continue
                if ec.type == EntryType.ENTITY:
                    raise EntriesDoNotExistException([r])
                if ec.type == EntryType.ARTIFACT:
                    try:
                        entries.append(Entry(name=r.value, entry_class=ec))
                    except InvalidEntryException as e:
                        note.set_status(
                            NoteStatus.INVALID,
                            (note.status_message or "") + e.detail.strip() + "\n",
                        )
                        note.save()
                        logger.warning(e.detail)

            Entry.objects.bulk_create(entries, ignore_conflicts=True)
            objs = []
            if entries:
                keys = [(e.name, e.entry_class_id) for e in entries]
                conditions = Q()
                for n, ec in keys:
                    conditions |= Q(name=n, entry_class_id=ec)
                fetched = {(e.name, e.entry_class_id): e for e in Entry.objects.filter(conditions)}
                for entry in entries:
                    key = (entry.name, entry.entry_class_id)
                    if key in fetched:
                        objs.append(fetched[key])
                    else:
                        obj, _ = Entry.objects.get_or_create(
                            name=entry.name,
                            entry_class__subtype=entry.entry_class.subtype,
                            defaults={"entry_class": entry.entry_class},
                        )
                        objs.append(obj)

            note.entries.add(*(entries_to_add + objs))

            content_type = ContentType.objects.get_for_model(note)
            entry_class_ids = [e.entry_class_id for e in objs]
            ec_with_children = set(
                EntryClass.objects.filter(pk__in=entry_class_ids)
                .annotate(child_count=Count("children"))
                .filter(child_count__gt=0)
                .values_list("pk", flat=True)
            )
            childscan = [e.id for e in objs if e.entry_class_id in ec_with_children]

            for entry in objs:
                if user_id:
                    entry.save()
                    entry.log_create(user)

            if childscan:
                scan_for_children.delay(childscan, content_type.id, note.id)

            note.save()
    except EntriesDoNotExistException as e:
        note.set_status(NoteStatus.INVALID, e.detail)
        note.save()

        raise e


@shared_task(autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3)
def connect_aliases(note_id, user_id=None):
    """Create alias entries and relations from note reference tree.

    Args:
        note_id: ID of the Note object to process.
        user_id: ID of the user performing the action (optional, for logging).
    """
    from entries.tasks import refresh_edges_materialized_view

    alias_class, _ = EntryClass.objects.get_or_create(
        subtype=SUBTYPE_ALIAS, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_ALIAS]
    )

    note = Note.objects.get(id=note_id)
    user = CradleUser.objects.get(id=user_id) if user_id else None
    aliases = {}

    for r in note.reference_tree.all_links():
        if r.alias is None:
            continue
        if r.alias not in aliases:
            aliases[r.alias] = set()

        aliases[r.alias].add((r.key, r.value))

    # Batch fetch all entries needed for alias relations
    all_subtype_name = [(s, n) for entries in aliases.values() for s, n in entries]
    if all_subtype_name:
        entry_conditions = Q()
        for subtype, name in all_subtype_name:
            entry_conditions |= Q(entry_class__subtype=subtype, name=name)
        entry_map = {
            (e.entry_class.subtype, e.name): e
            for e in Entry.objects.filter(entry_conditions).select_related("entry_class")
        }
    else:
        entry_map = {}

    for aname, entries in aliases.items():
        if not entries:
            continue

        alias, created = Entry.objects.get_or_create(name=aname, entry_class=alias_class)

        if created and user:
            alias.log_create(user)

        note.entries.add(alias)

        relations = []
        for subtype, name in entries:
            e = entry_map.get((subtype, name))
            if e is None:
                continue
            relations.append(
                Relation(
                    e1=e,
                    e2=alias,
                    content_object=note,
                    access_vector=note.access_vector,
                    reason=RelationReason.ALIAS,
                    virtual=True,
                )
            )

        if relations:
            Relation.objects.bulk_create(relations)

    refresh_edges_materialized_view.apply_async()


@shared_task
@distributed_lock("propagate_acvec_{note_id}", timeout=3600)
def propagate_acvec(note_id):
    """Propagate note's access vector to all its relations."""
    note = Note.objects.get(id=note_id)
    return note.relations.update(access_vector=note.access_vector)


@shared_task
@distributed_lock("finalize_note_{note_id}", timeout=1800)
def note_finalize_task(note_id):
    """Mark note as healthy when processing is complete."""
    note = Note.objects.get(id=note_id)
    if note.status == NoteStatus.PROCESSING:
        note.set_status(NoteStatus.HEALTHY)
        note.save()


@shared_task
@distributed_lock("metadata_process_{note_id}", timeout=1800)
def note_metadata_process_task(note_id):
    """Extract and apply metadata (title, description) from note frontmatter."""
    note = Note.objects.get(id=note_id)

    offset, metadata = infer_metadata(note.content)

    for key, field in Note.metadata_fields.items():
        if field:
            setattr(note, field, getattr(Note, field, None).field.default)
        if key not in metadata:
            continue

        value = metadata.get(key)

        if field is None:
            metadata.pop(key, None)
            continue

        setattr(note, field, value)

    note.content_offset = offset
    note.metadata = json.loads(json.dumps(metadata, cls=DjangoJSONEncoder))

    if not (note.title or "").strip():
        note.set_status(NoteStatus.WARNING, "Note title is empty.")

    note.save()

from collections import defaultdict
from celery import shared_task
from django.contrib.contenttypes.models import ContentType
from django.db import close_old_connections
from django.utils import timezone
from entries.enums import EntryType
from entries.exceptions import InvalidEntryException
from intelio.enums import EnrichmentStrategy
from user.models import CradleUser
from .markdown.to_links import Link
from .models import Note
from entries.models import Relation

from core.decorators import distributed_lock
from notes.exceptions import EntriesDoNotExistException, EntryClassesDoNotExistException
from entries.models import Entry, EntryClass
from entries.enums import RelationReason
from notes.enums import NoteStatus
from management.settings import cradle_settings


import logging

logger = logging.getLogger(__name__)


@shared_task
@distributed_lock("smartlinker_note_{note_id}", timeout=1800)
def smart_linker_task(note_id):
    from entries.tasks import refresh_edges_materialized_view

    """
    Celery task to create links between entries for a given note.

    Args:
        note_id: ID of the Note object to process
    """

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
                logger.warning(
                    f"Pair ({src}, {dst}) not found in entries. Skipping this pair."
                )

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
        refresh_edges_materialized_view.apply_async(simulate=True)

    return note_id


@shared_task
@distributed_lock("link_files_note_{note_id}", timeout=1800)
def link_files_task(note_id, file_ref_id=None):
    from entries.tasks import refresh_edges_materialized_view

    """
    Celery task to create links between entries for a given note.

    Args:
        note_id: ID of the Note object to process
    """
    note = Note.objects.get(id=note_id)

    md5_subclass = cradle_settings.files.md5_subtype
    sha256_subclass = cradle_settings.files.sha256_subtype
    sha1_subclass = cradle_settings.files.sha1_subtype

    md5_et, sha256_et, sha1_et = None, None, None

    if (
        md5_subclass
        and EntryClass.objects.filter(
            type=EntryType.ARTIFACT, subtype=md5_subclass
        ).exists()
    ):
        md5_et = EntryClass.objects.get(type=EntryType.ARTIFACT, subtype=md5_subclass)

    if (
        sha256_subclass
        and EntryClass.objects.filter(
            type=EntryType.ARTIFACT, subtype=sha256_subclass
        ).exists()
    ):
        sha256_et = EntryClass.objects.get(
            type=EntryType.ARTIFACT, subtype=sha256_subclass
        )

    if (
        sha1_subclass
        and EntryClass.objects.filter(
            type=EntryType.ARTIFACT, subtype=sha1_subclass
        ).exists()
    ):
        sha1_et = EntryClass.objects.get(type=EntryType.ARTIFACT, subtype=sha1_subclass)

    relations = []
    if file_ref_id is None:
        files = note.files.all()
    else:
        file_ref = note.files.filter(id=file_ref_id).first()
        if not file_ref:
            logger.warning(
                f"File reference with ID {file_ref_id} not found in note {note_id}."
            )
            return note_id

        files = [file_ref]

    for f in files:
        if cradle_settings.files.autoprocess_files:
            f.process_file()

        note.entries.add(f.entry)

        for e in f.entities:
            relations.append(
                Relation(
                    e1=e,
                    e2=f.entry,
                    content_object=note,
                    access_vector=note.access_vector,
                    reason=RelationReason.NOTE,
                    virtual=False,
                )
            )

        hashes = []
        if f.md5_hash and md5_et:
            entry, _ = Entry.objects.get_or_create(name=f.md5_hash, entry_class=md5_et)
            note.entries.add(entry)
            hashes.append(entry)

        if f.sha256_hash and sha256_et:
            entry, _ = Entry.objects.get_or_create(
                name=f.sha256_hash, entry_class=sha256_et
            )
            note.entries.add(entry)
            hashes.append(entry)

        if f.sha1_hash and sha1_et:
            entry, _ = Entry.objects.get_or_create(
                name=f.sha1_hash, entry_class=sha1_et
            )
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


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=60, max_retries=1
)
def entry_class_creation_task(note_id, user_id=None):
    """
    Celery task to create missing entry classes for a note.
    """
    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    virtual_class = EntryClass.objects.filter(subtype="virtual")

    if not virtual_class.exists():  # If alias type does not exist, create it
        virtual_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="virtual",
            color="#7f8389",
        )

    file_class = EntryClass.objects.filter(subtype="file")

    if not file_class.exists():  # If alias type does not exist, create it
        file_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="file",
            color="#7f8389",
        )

    try:
        nonexistent_entries = set()

        for r in note.reference_tree.all_links():
            if not EntryClass.objects.filter(subtype=r.key).exists():
                if not cradle_settings.notes.allow_dynamic_entry_class_creation:
                    nonexistent_entries.add(r.key)
                else:
                    entry = EntryClass.objects.create(
                        type=EntryType.ARTIFACT, subtype=r.key
                    )
                    if user_id:
                        entry.log_create(user)

        if nonexistent_entries:
            raise EntryClassesDoNotExistException(nonexistent_entries)
    except EntryClassesDoNotExistException as e:
        note.set_status(NoteStatus.INVALID, e.detail)
        note.save()

        raise e


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3
)
def entry_population_task(note_id, user_id=None, force_contains_check=False):
    """
    Celery task to create missing entries for a note.
    """
    from entries.tasks import scan_for_children
    from intelio.tasks import enrich_entries

    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    note.entries.clear()

    try:
        entries = []
        for r in note.reference_tree.all_links():
            entry = Entry.objects.filter(name=r.value, entry_class__subtype=r.key)
            if not entry.exists():
                try:
                    entry_class = EntryClass.objects.get(subtype=r.key)
                except EntryClass.DoesNotExist:
                    logging.warning(
                        f"Entry class {r.key} does not exist. Skipping entry creation."
                    )
                    continue

                if entry_class.type == EntryType.ARTIFACT:
                    try:
                        entries.append(Entry(name=r.value, entry_class=entry_class))
                    except InvalidEntryException as e:
                        note.set_status(
                            NoteStatus.INVALID,
                            note.status_message + e.detail.strip() + "\n",
                        )
                        note.save()

                        logger.warning(e.detail)
                else:
                    raise EntriesDoNotExistException([r])
            else:
                entry = entry.first()
                note.entries.add(entry)

        new_objs = Entry.objects.bulk_create(entries, ignore_conflicts=True)

        objs = [None] * len(new_objs)
        for i, e in enumerate(new_objs):
            # print(e.name, e.entry_class.subtype)
            if e.id is None:
                objs[i], _ = Entry.objects.get_or_create(
                    name=e.name, entry_class__subtype=e.entry_class.subtype
                )
            else:
                objs[i] = e

        note.entries.add(*objs)

        childscan = []
        enrich = defaultdict(list)
        for entry in objs:
            content_type = ContentType.objects.get_for_model(note)

            if entry.entry_class.children.count() > 0:
                childscan.append(entry.id)

        for entry in objs:
            if entry is None:
                continue

            for e in entry.entry_class.enrichers.filter(
                strategy=EnrichmentStrategy.ON_CREATE, enabled=True
            ):
                enrich[e.id].append(entry.id)

            if user_id:
                entry.save()
                entry.log_create(user)  # Pass user_id for logging

        if len(childscan):
            scan_for_children.delay(childscan, content_type.id, note.id)

        if len(enrich):
            for k, v in enrich:
                enrich_entries.delay(k, v, content_type.id, note.id)

        note.save()
    except EntriesDoNotExistException as e:
        note.set_status(NoteStatus.INVALID, e.detail)
        note.save()

        raise e


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3
)
def connect_aliases(note_id, user_id=None):
    """
    Celery task to connect aliases in a note
    """
    from entries.tasks import refresh_edges_materialized_view

    alias_class = EntryClass.objects.filter(subtype="alias")

    if not alias_class.exists():  # If alias type does not exist, create it
        alias_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="alias",
            color="#7f8389",
        )

    note = Note.objects.get(id=note_id)

    if user_id:
        user = CradleUser.objects.get(id=user_id)
    else:
        user = None

    aliases = {}

    for r in note.reference_tree.all_links():
        if r.alias is None:
            continue
        if r.alias not in aliases:
            aliases[r.alias] = set()

        aliases[r.alias].add((r.key, r.value))

    for aname, entries in aliases.items():
        if len(entries) == 0:
            continue

        alias, created = Entry.objects.get_or_create(name=aname, entry_class_id="alias")

        if created and user:
            alias.log_create(user)

        note.entries.add(alias)

        subtypes, names = zip(*entries)
        relations = []

        for subtype, name in entries:
            e = Entry.objects.get(name=name, entry_class__subtype=subtype)
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

        refresh_edges_materialized_view.apply_async()

        Relation.objects.bulk_create(relations)


@shared_task
@distributed_lock("propagate_acvec_{note_id}", timeout=3600)
def propagate_acvec(note_id):
    note = Note.objects.get(id=note_id)

    return note.relations.update(access_vector=note.access_vector)


@shared_task
@distributed_lock("finalize_note_{note_id}", timeout=1800)
def note_finalize_task(note_id):
    note = Note.objects.get(id=note_id)

    if note.status == NoteStatus.PROCESSING:
        note.set_status(NoteStatus.HEALTHY)
        note.save()

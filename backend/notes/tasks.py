import itertools
from celery import shared_task
from django.db import close_old_connections
from django_lifecycle.mixins import transaction
from entries.enums import EntryType
from user.models import CradleUser
from .markdown.to_links import Link
from .models import Note, Relation
from core.decorators import distributed_lock
from django.conf import settings
from notes.exceptions import EntriesDoNotExistException, EntryClassesDoNotExistException
from entries.models import Entry, EntryClass


@shared_task
@distributed_lock("smartlinker_note_{note_id}", timeout=1800)
def smart_linker_task(note_id):
    """
    Celery task to create links between entries for a given note.

    Args:
        note_id: ID of the Note object to process
    """
    note = Note.objects.get(id=note_id)

    try:
        Relation.objects.filter(note=note).delete()

        pairs = note.reference_tree.relation_pairs()
        pairs_resolved = set()

        entries = {}
        for e in note.entries.all():
            entries[Link(e.entry_class.subtype, e.name)] = e

        entities = {
            x for x in entries.values() if x.entry_class.type == EntryType.ENTITY
        }
        artifacts = {
            x for x in entries.values() if x.entry_class.type == EntryType.ARTIFACT
        }

        # Resolve pairs from reference tree
        for src, dst in pairs:
            pairs_resolved.add((entries[src], entries[dst]))

        # Add entity-artifact permutations
        for e, a in itertools.product(entities, artifacts):
            pairs_resolved.add((e, a))
            pairs_resolved.add((a, e))

        # Bulk create relations
        Relation.objects.bulk_create(
            [
                Relation(
                    src_entry=src,
                    dst_entry=dst,
                    content_object=note,
                    access_vector=note.access_vector,
                )
                for src, dst in pairs_resolved
            ]
        )

    finally:
        close_old_connections()

    return note_id


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3
)
def entry_class_creation_task(note_id, user_id=None):
    """
    Celery task to create missing entry classes for a note.
    """
    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    nonexistent_entries = set()

    for r in note.reference_tree.links():
        if not EntryClass.objects.filter(subtype=r.key).exists():
            if not settings.AUTOREGISTER_ARTIFACT_TYPES:
                nonexistent_entries.add(r.key)
            else:
                entry = EntryClass.objects.create(
                    type=EntryType.ARTIFACT, subtype=r.key
                )
                if user_id:
                    entry.log_create(user)

    if nonexistent_entries:
        raise EntryClassesDoNotExistException(nonexistent_entries)


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3
)
def entry_population_task(note_id, user_id=None):
    """
    Celery task to create missing entries for a note.
    """
    note = Note.objects.get(id=note_id)
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    with transaction.atomic():
        note.entries.clear()
        for r in note.reference_tree.links():
            entry = Entry.objects.filter(name=r.value, entry_class__subtype=r.key)
            if len(entry) == 0:
                entry_class = EntryClass.objects.get(subtype=r.key)

                if entry_class.type == EntryType.ARTIFACT:
                    entry = Entry.objects.create(name=r.value, entry_class=entry_class)
                    if user_id:
                        entry.log_create(user)  # Pass user_id for logging
                else:
                    raise EntriesDoNotExistException([r])
            else:
                entry = entry.first()

            note.entries.add(entry)
        note.save()


@shared_task(
    autoretry_for=(Exception,), retry_backoff=30, retry_backoff_max=300, max_retries=3
)
def connect_aliases(note_id, user_id=None):
    """
    Celery task to connect aliases in a note
    """
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

    for r in note.reference_tree.links():
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
                Relation(src_entry=alias, dst_entry=e, content_object=note)
            )
            relations.append(
                Relation(src_entry=e, dst_entry=alias, content_object=note)
            )

        Relation.objects.bulk_create(relations)


@shared_task
@distributed_lock("propagate_acvec_{note_id}", timeout=3600)
def propagate_acvec(note_id):
    note = Note.objects.get(id=note_id)

    return note.relations.update(access_vector=note.access_vector)

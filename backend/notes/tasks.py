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
                Relation(src_entry=src, dst_entry=dst, content_object=note)
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

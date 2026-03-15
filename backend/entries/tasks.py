"""Celery tasks for entries: access updates, note remapping, graph refresh."""

from celery import group, shared_task
from django.contrib.contenttypes.models import ContentType
from django.db import connection, transaction
from django.db.models import Count

from core.decorators import debounce_task, distributed_lock
from intelio.tasks import propagate_acvec_digest, propagate_acvec_enrich
from notes.markdown.to_markdown import remap_links
from notes.models import Note
from notes.processor.task_scheduler import TaskScheduler
from notes.tasks import propagate_acvec
from notes.utils import calculate_acvec
from user.models import CradleUser

from .constants import SUBTYPE_NOTE
from .enums import EntryType, RelationReason
from .models import Edge, Entry, Relation


@shared_task
@distributed_lock("update_accesses_{entry_id}", timeout=3600)
def update_accesses(entry_id):
    """Propagate access vector changes from an entry to its notes, digests, and enrichments."""
    entry = Entry.objects.get(id=entry_id)
    entry.status = {"status": "warning", "message": "Updating access controls"}
    entry.save()

    notes = entry.notes.all()
    update_notes = []

    for note in notes:
        newvec = calculate_acvec(note.entries.filter(entry_class__type=EntryType.ENTITY))

        if newvec != note.access_vector:
            note.access_vector = newvec
            update_notes.append(note)

    if update_notes:
        note_model = update_notes[0].__class__
        note_model.objects.bulk_update(update_notes, ["access_vector"])

    digest_ids = entry.digests.all().values_list("id", flat=True)
    enrich_ids = entry.enrichments.all().values_list("id", flat=True)

    entry.status = {}
    entry.save()

    g_notes = group(*[propagate_acvec.si(n.id) for n in update_notes])
    g_digests = group(*[propagate_acvec_digest.si(d) for d in digest_ids])
    g_enrichs = group(*[propagate_acvec_enrich.si(e) for e in enrich_ids])

    transaction.on_commit(lambda: g_notes.apply_async())
    transaction.on_commit(lambda: g_digests.apply_async())
    transaction.on_commit(lambda: g_enrichs.apply_async())

    return f"Updated {len(update_notes)} notes"


@shared_task
def remap_notes_task(note_ids, mapping_eclass, mapping_entry, user_id=None):
    """Remap entry links in notes after entry class or entry rename/deletion."""
    notes = list(Note.objects.filter(id__in=note_ids))
    if user_id:
        user = CradleUser.objects.get(id=user_id)
    else:
        user = None

    mapping_entry = {tuple(k.split(":", 1)): v for k, v in mapping_entry.items()}

    for note in notes:
        content = remap_links(note.content, mapping_eclass, mapping_entry)
        TaskScheduler(user, content=content).run_pipeline(note, validate=False)


@shared_task
def scan_for_children(entry_ids, content_type_id, content_id):
    """Create CONTAINS relations from entries to matched child entries via regex/options."""
    content_type = ContentType.objects.get(id=content_type_id)
    content_object = content_type.get_object_for_this_type(id=content_id)

    entries = Entry.objects.filter(id__in=entry_ids)

    Relation.objects.filter(
        reason=RelationReason.CONTAINS,
        content_type=content_type,
        object_id=content_id,
    ).delete()

    relations = []

    for entry in entries:
        matches = {}
        for child in entry.entry_class.children.all():
            matches[child] = child.match(entry.name)

        for k, v in matches.items():
            for i in v:
                e, _ = Entry.objects.get_or_create(name=i, entry_class=k)
                rel = Relation(
                    e1=e,
                    e2=entry,
                    reason=RelationReason.CONTAINS,
                    inherit_av=True,
                    access_vector=getattr(content_object, "access_vector", 1),
                    content_object=content_object,
                )
                relations.append(rel)

    if relations:
        Relation.objects.bulk_create(relations)

    refresh_edges_materialized_view.apply_async()


@debounce_task(timeout=180)
@shared_task
def refresh_edges_materialized_view():
    """Refreshes the 'edges' materialized view concurrently.

    Ensure that a unique index (e.g., on 'id') exists on the view, like:

        CREATE UNIQUE INDEX idx_edges_id ON edges(id);

    This allows the materialized view to be refreshed concurrently,
    which minimizes downtime for reads.
    """
    with connection.cursor() as cursor:
        cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY edges;")

    degree_map = dict(Edge.objects.values("src").annotate(degree=Count("id")).values_list("src", "degree"))
    entry_ids = list(Entry.objects.exclude(entry_class__subtype=SUBTYPE_NOTE).values_list("id", flat=True))
    updates = [Entry(id=eid, degree=degree_map.get(eid, 0)) for eid in entry_ids]

    if updates:
        Entry.objects.bulk_update(updates, ["degree"])

    Entry.objects.filter(entry_class__subtype=SUBTYPE_NOTE).update(degree=0)


@shared_task
def delete_hanging_artifacts():
    """Delete artifacts that have no relations (unreferenced)."""
    return Entry.artifacts.unreferenced().delete()[0]

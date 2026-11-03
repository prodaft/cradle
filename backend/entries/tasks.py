"""Celery tasks for entries: access updates, note remapping, graph refresh."""

from celery import chord, group, shared_task
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.db import connection, transaction
from django.db.models import Q

from core.decorators import debounce_task, distributed_lock
from intelio.tasks import propagate_acvec_digest, propagate_acvec_enrich
from notes.markdown.to_markdown import remap_links
from notes.models import Note
from notes.processor.task_scheduler import TaskScheduler
from notes.tasks import propagate_acvec
from user.models import CradleUser

from .enums import RelationReason
from .models import Entry, Relation, calculate_acvec


@shared_task
@distributed_lock("update_accesses_{entry_id}", timeout=3600)
def update_accesses(entry_id, propagate_inline=False):
    """Propagate access vector changes from an entry to its notes, alias relations, digests, and enrichments.

    The notes, digests and enrichments are queued as separate tasks; with ``propagate_inline`` they run in this
    task instead, so it finishing means they are done (propagate_all_access_vectors_task waits on it).
    """
    entry = Entry.objects.get(id=entry_id)

    notes = entry.notes.all()
    update_notes = []

    for note in notes:
        newvec = calculate_acvec(note.entries.is_entity())

        if newvec != note.access_vector:
            note.access_vector = newvec
            update_notes.append(note)

    if update_notes:
        note_model = update_notes[0].__class__
        note_model.objects.bulk_update(update_notes, ["access_vector"])

    alias_relations = list(
        Relation.objects.filter(
            Q(e1=entry) | Q(e2=entry),
            reason=RelationReason.ALIAS,
            content_type=ContentType.objects.get_for_model(Entry),
        ).select_related("e1__entry_class", "e2__entry_class")
    )
    for relation in alias_relations:
        relation.access_vector = Relation.alias_acvec(relation.e1, relation.e2)
    if alias_relations:
        Relation.objects.bulk_update(alias_relations, ["access_vector"])
        transaction.on_commit(lambda: refresh_edges_materialized_view.apply_async())

    propagations = [
        *(propagate_acvec.si(note.id) for note in update_notes),
        *(propagate_acvec_digest.si(d) for d in entry.digests.all().values_list("id", flat=True)),
        *(propagate_acvec_enrich.si(e) for e in entry.enrichment_requests.all().values_list("id", flat=True)),
    ]
    if propagate_inline:
        for propagation in propagations:
            try:
                propagation()
            except ObjectDoesNotExist:
                pass  # deleted since this task listed it; nothing left to propagate to
    else:
        transaction.on_commit(lambda: group(propagations).apply_async())

    return f"Updated {len(update_notes)} notes"


@shared_task
def propagate_all_access_vectors_task(user_id):
    """Run update_accesses for every entity in parallel, then refresh the graph and notify ``user_id``."""
    from notifications.tasks import notify_user_task

    entity_ids = list(Entry.entities.values_list("id", flat=True))
    finished = access_vectors_propagated_task.si(user_id, len(entity_ids)).on_error(
        notify_user_task.si(user_id, "Propagate Access Vectors failed. Check the worker logs for details.")
    )
    chord([update_accesses.si(entity_id, propagate_inline=True) for entity_id in entity_ids])(finished)


@shared_task
def access_vectors_propagated_task(user_id, entity_count):
    """Chord callback of propagate_all_access_vectors_task: refresh the graph so it shows the result, then notify."""
    from notifications.tasks import notify_user_task

    refresh_edges_materialized_view()
    entities = "entity" if entity_count == 1 else "entities"
    notify_user_task(user_id, f"Propagate Access Vectors finished for {entity_count} {entities}.")


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
                if not Relation.includes_entity(e, entry):
                    continue
                rel = Relation(
                    e1=e,
                    e2=entry,
                    reason=RelationReason.CONTAINS,
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

        CREATE UNIQUE INDEX idx_edges_id_access_vector ON edges(id, access_vector);

    This allows the materialized view to be refreshed concurrently,
    which minimizes downtime for reads.
    """
    with connection.cursor() as cursor:
        cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY edges;")


@shared_task
def delete_hanging_artifacts():
    """Delete artifacts nothing points at (no relations, notes or aliasing entity)."""
    _, per_model = Entry.artifacts.unreferenced().delete()
    return per_model.get(Entry._meta.label, 0)

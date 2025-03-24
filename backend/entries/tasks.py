from celery import group, shared_task
from core.fields import BitStringField
from entries.enums import EntryType
from core.decorators import distributed_lock
from entries.models import Entry
from intelio.models.enrichments.matrushka import MatrushkaAssociation
from notes.processor.task_scheduler import TaskScheduler
from notes.utils import calculate_acvec
from notes.tasks import propagate_acvec
from django.db import transaction

from notes.models import Note
from notes.markdown.to_markdown import remap_links


@shared_task
@distributed_lock("update_accesses_{entry_id}", timeout=3600)
def update_accesses(entry_id):
    entry = Entry.objects.get(id=entry_id)
    entry.status = {"status": "warning", "message": "Updating access controls"}
    entry.save()

    notes = list(entry.notes.all())
    update_notes = []

    for note in notes:
        newvec = calculate_acvec(
            note.entries.filter(entry_class__type=EntryType.ENTITY)
        )

        if newvec != note.access_vector:
            note.access_vector = newvec
            update_notes.append(note)

    if update_notes:
        note_model = update_notes[0].__class__
        note_model.objects.bulk_update(update_notes, ["access_vector"])

    # Reset the status field.
    entry.status = None
    entry.save()

    g = group(*[propagate_acvec.si(n.id) for n in update_notes])

    transaction.on_commit(lambda: g.apply_async())

    return f"Updated {len(update_notes)} notes"


@shared_task
def remap_notes_task(note_ids, mapping_eclass, mapping_entry):
    notes = list(Note.objects.filter(id__in=note_ids))
    mapping_entry = {tuple(k.split(":", 1)): v for k, v in mapping_entry.items()}

    for note in notes:
        note.content = remap_links(note.content, mapping_eclass, mapping_entry)

    Note.objects.bulk_update(notes, ["content"])

    for n in notes:
        TaskScheduler(None).run_pipeline(n, validate=False)


@shared_task
def scan_for_children(entry_id):
    entry = Entry.objects.get(id=entry_id)

    matches = {}
    for child in entry.entry_class.children.all():
        matches[child] = child.match(entry.name)

    for k, v in matches.items():
        for i in v:
            e, _ = Entry.objects.get_or_create(name=i, entry_class=k)
            ass = MatrushkaAssociation(access_vector=1, e1=e, e2=entry)
            ass.save()


@shared_task
def enrich_entry(entry_id, enricher_id):
    pass

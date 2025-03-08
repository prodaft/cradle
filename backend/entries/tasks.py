from celery import group, shared_task
from entries.enums import EntryType
from core.decorators import distributed_lock
from entries.models import Entry
from notes.utils import calculate_acvec
from notes.tasks import propagate_acvec
from django.db import transaction


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

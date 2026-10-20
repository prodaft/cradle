from django.db import migrations


def rewrite_legacy_footnote_keys(apps, schema_editor):
    """Point note footnotes that still use the old MinIO object key at the current file key."""
    FileReference = apps.get_model("file_transfer", "FileReference")
    Note = apps.get_model("notes", "Note")

    legacy_refs = (
        FileReference.objects.filter(note__isnull=False, minio_file_name__isnull=False)
        .exclude(minio_file_name="")
        .exclude(file="")
        .exclude(file__isnull=True)
        .values_list("note_id", "minio_file_name", "file")
    )

    renames_by_note: dict = {}
    for note_id, old_key, new_key in legacy_refs:
        if old_key != new_key:
            renames_by_note.setdefault(note_id, []).append((old_key, new_key))

    for note in Note.objects.filter(id__in=renames_by_note.keys()).only("id", "content"):
        content = note.content or ""
        for old_key, new_key in renames_by_note[note.id]:
            content = content.replace(old_key, new_key)
        if content != note.content:
            Note.objects.filter(id=note.id).update(content=content)


class Migration(migrations.Migration):

    dependencies = [
        ("file_transfer", "0016_alter_filereference_file_max_length"),
        ("notes", "0029_alter_archivednote_content_alter_archivednote_id_and_more"),
    ]

    operations = [
        migrations.RunPython(rewrite_legacy_footnote_keys, migrations.RunPython.noop),
        migrations.RemoveField(model_name="filereference", name="minio_file_name"),
        migrations.RemoveField(model_name="filereference", name="bucket_name"),
    ]

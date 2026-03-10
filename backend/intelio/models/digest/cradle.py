import json

from celery import group
from django.db import transaction

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from file_transfer.storage import FileTransferStorage
from notes.processor.task_scheduler import TaskScheduler

from ...enums import DigestStatus
from ...tasks.cradle import download_file_for_note
from ..base import BaseDigest


class CradleDigest(BaseDigest):
    """Digest for CRADLE JSON reports: notes, entry classes, entries, and file URLs."""

    display_name = "CRADLE Report"
    infer_entities = True

    class Meta:
        proxy = True

    def _digest(self):
        """Parse CRADLE JSON report, create notes/entries, and schedule file downloads."""
        self.ensure_local_file()
        with open(self.path, "r") as report_file:
            try:
                report_data = json.load(report_file)
            except json.JSONDecodeError as e:
                self.status = DigestStatus.ERROR
                self.errors = ["Invalid JSON format: " + e.msg]
                self.save()
                return

        valid_entryclass_fields = {f.name for f in EntryClass._meta.fields}

        try:
            # Import or create entry classes
            for eclass in report_data.get("entry_classes", []):
                if not EntryClass.objects.filter(subtype=eclass["subtype"]).exists():
                    EntryClass.objects.create(**{k: v for k, v in eclass.items() if k in valid_entryclass_fields})

            # Cache existing entity subtypes
            entity_subtypes = set(EntryClass.objects.filter(type=EntryType.ENTITY).values_list("subtype", flat=True))

            # Create new entries if needed
            for entry in report_data.get("entries", []):
                if (
                    entry["subtype"] in entity_subtypes
                    and not Entry.objects.filter(name=entry["name"], entry_class_id=entry["subtype"]).exists()
                ):
                    Entry.objects.create(
                        name=entry["name"],
                        entry_class_id=entry["subtype"],
                        description=entry.get("description", ""),
                    )

            created_notes = []
            download_tasks = []

            for idx, note_data in enumerate(report_data.get("notes", [])):
                scheduler = TaskScheduler(self.user, content=note_data["content"], digest=self)
                try:
                    created_note = scheduler.run_pipeline(validate=True)
                except Exception:
                    self._append_error(f"Failed to create note {idx}")
                    continue

                file_urls = note_data.get("file_urls", {})
                for file_identifier, url in file_urls.items():
                    download_tasks.append(
                        download_file_for_note.si(
                            created_note.id, file_identifier, url, FileTransferStorage.bucket_name, self.id
                        )
                    )
                created_note.save()
                created_notes.append(created_note)

            self.summary = {
                "notes_imported": len(created_notes),
                "entry_classes_imported": len(report_data.get("entry_classes", [])),
                "files_scheduled": len(download_tasks),
                "files_failed": 0,
                "files_downloaded": 0,
            }
            self.save(update_fields=["summary"])

            if download_tasks:
                transaction.on_commit(lambda: group(*download_tasks).apply_async())
            else:
                self.finalize()
        except Exception as e:
            self.status = DigestStatus.ERROR
            self.errors = [str(e)]
            self.save()
            raise e

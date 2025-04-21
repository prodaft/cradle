from entries.enums import EntryType
from entries.models import Entry, EntryClass
from intelio.enums import DigestStatus
from notes.processor.task_scheduler import TaskScheduler
from ..base import BaseDigest
import json


class CradleDigest(BaseDigest):
    display_name = "CRADLE Report"

    class Meta:
        proxy = True

    def _digest(self):
        with open(self.path, "r") as report_file:
            try:
                report_data = json.load(report_file)
            except json.JSONDecodeError as e:
                self.status = DigestStatus.ERROR
                self.errors = ["Invalid JSON format: " + e.msg]
                self.save()
                return

        valid_entryclass_fields = set([x.name for x in EntryClass._meta.fields])

        try:
            # Import or create entry classes
            for eclass in report_data.get("entry_classes", []):
                if not EntryClass.objects.filter(subtype=eclass["subtype"]).exists():
                    EntryClass.objects.create(
                        **{
                            k: v
                            for k, v in eclass.items()
                            if k in valid_entryclass_fields
                        }
                    )

            # Cache existing entity subtypes
            entity_subtypes = set(
                EntryClass.objects.filter(type=EntryType.ENTITY).values_list(
                    "subtype", flat=True
                )
            )

            # Create new entries if needed
            for entry in report_data.get("entries", []):
                if (
                    entry["subtype"] in entity_subtypes
                    and not Entry.objects.filter(
                        name=entry["name"], entry_class_id=entry["subtype"]
                    ).exists()
                ):
                    Entry.objects.create(
                        name=entry["name"],
                        entry_class_id=entry["subtype"],
                        description=entry["description"],
                    )

            created_notes = []
            # bucket_name = self.user.id
            files_scheduled = 0

            for note_data in report_data.get("notes", []):
                scheduler = TaskScheduler(
                    self.user, content=note_data["content"], digest=self
                )
                created_note = scheduler.run_pipeline(validate=False)

                file_urls = note_data.get("file_urls", {})
                for file_identifier, url in file_urls.items():
                    # download_file_for_note.delay(
                    #     created_note.id, file_identifier, url, bucket_name
                    # )
                    files_scheduled += 1

                created_note.save()
                created_notes.append(created_note)

            summary = {
                "notes_imported": len(created_notes),
                "entry_classes_imported": len(report_data.get("entry_classes", [])),
                "files_scheduled": files_scheduled,
            }

            return summary
        except Exception as e:
            self.status = DigestStatus.ERROR
            self.errors = [str(e)]
            self.save()
            raise e

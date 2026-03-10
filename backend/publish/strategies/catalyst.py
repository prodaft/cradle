from typing import Iterable, Optional

import requests
from django.conf import settings

from entries.models import Entry, EntryClass
from file_transfer.s3_utils import fetch_bytes
from file_transfer.storage import FileTransferStorage
from intelio.models.mappings.catalyst import CatalystMapping
from notes.markdown.to_platejs import markdown_to_pjs
from notes.models import Note
from user.models import CradleUser

from ..models import PublishedReport, ReportStatus
from .base import BasePublishStrategy


class CatalystPublish(BasePublishStrategy):
    """Upload reports to Catalyst (Prodaft) via API."""

    def __init__(self, tlp: str, category: str, subcategory: str, anonymized: bool) -> None:
        """Initialize with TLP, category, subcategory, and anonymization flag."""
        super().__init__(anonymized)
        self.category = category
        self.subcategory = subcategory
        self.tlp = tlp
        self.typemapping: dict[EntryClass, CatalystMapping] = CatalystMapping.get_typemapping()

    def get_remote_url(self, report: PublishedReport) -> str:
        """Return Catalyst review URL for the published report."""
        if not report.external_ref:
            raise ValueError("Report does not have an external reference.")
        return "https://catalyst.prodaft.com/publications/review/" + report.external_ref

    def get_entity(
        self, catalyst_type: CatalystMapping, name: str, user: CradleUser
    ) -> Optional[dict[str, Optional[str]]]:
        """Fetch or create entity in Catalyst; returns entity dict or None on failure."""
        url = f"{settings.CATALYST_HOST}/api/{catalyst_type.type}/"
        params = {catalyst_type.field: name}

        if catalyst_type.extras:
            for extra in catalyst_type.extras.split(","):
                if extra.strip() and "=" in extra:
                    key, value = extra.split("=", 1)
                    params[key.strip()] = value.strip()

        response = requests.get(
            url,
            params=params,
            headers={"Authorization": "Token " + user.catalyst_api_key},
        )

        if response.status_code == 200:
            if response.json()["count"] > 0:
                data = response.json()["results"][0]
                res = {
                    "id": data["id"],
                    "type": catalyst_type.link_type,
                    "level": (catalyst_type.level or "").upper(),
                    "value": data.get("value") or data.get("name"),
                }
                return res
            response = requests.post(
                url,
                json=params,
                headers={"Authorization": "Token " + user.catalyst_api_key},
            )
            if response.status_code == 201:
                data = response.json()
                res = {
                    "id": data["id"],
                    "type": catalyst_type.link_type,
                    "value": data["value"],
                    "level": (catalyst_type.level or "").upper(),
                }
                return res
        return None

    def create_references(self, post_id: str, refs, user: CradleUser) -> Optional[str]:
        """Create entity references for a Catalyst post; returns error message or None on success."""
        references = []
        for entity in refs.values():
            if not entity.get("level"):
                continue
            references.append(
                {
                    "entity": entity["id"],
                    "entity_type": entity["type"],
                    "level": entity["level"],
                    "context": "",
                }
            )
        if not references:
            return None
        response = requests.post(
            f"{settings.CATALYST_HOST}/api/posts/references/bulk/",
            headers={"Authorization": "Token " + user.catalyst_api_key},
            json={"post": post_id, "references": references},
        )
        if response.status_code == 201:
            return None
        return f"Failed to create references: {response.status_code} {response.text}"

    def edit_report(self, report: PublishedReport) -> bool:
        """Delete existing Catalyst post and create a new one with updated content."""
        return self.delete_report(report) and self.create_report(report)

    def create_report(self, report: PublishedReport) -> bool:
        """Upload report to Catalyst via API; set external_ref on success."""
        if not report.user or not report.user.catalyst_api_key:
            report.error_message = "User has no Catalyst API key"
            report.status = ReportStatus.ERROR
            report.save()
            return False

        report.extra_data = report.extra_data or {}
        report.extra_data["warnings"] = []

        notes = list(report.notes.all())
        joint_md = "\n-----\n".join(self._anonymize_note(note).content for note in notes)
        entries: Iterable[Entry] = Note.objects.get_entries_from_notes(notes)
        entry_map = {}
        for i in entries:
            # Anonymize the entry before processing.
            anonymized_entry = self._anonymize_entry(i)
            if self.typemapping[i.entry_class] is None:
                continue

            entity = self.get_entity(self.typemapping[i.entry_class], anonymized_entry.name, report.user)

            key = (i.entry_class.subtype, anonymized_entry.name)
            if entity:
                entry_map[key] = entity
            else:
                if anonymized_entry.name != i.name:
                    report.extra_data["warnings"].append(
                        f"Failed to link entry {i.entry_class.subtype}:{i.name} ({anonymized_entry.name})"
                    )
                else:
                    report.extra_data["warnings"].append(f"Failed to link entry {i.entry_class.subtype}:{i.name}")

        footnotes = {}
        for note in notes:
            for f in note.files.all():
                if not f.file:
                    continue
                if f.minio_file_name:
                    footnotes[f.minio_file_name] = (
                        FileTransferStorage.bucket_name,
                        f.file.name,
                    )
                footnotes[f.file.name] = (FileTransferStorage.bucket_name, f.file.name)

        platejs = markdown_to_pjs(joint_md, entry_map, footnotes, lambda bucket, key: fetch_bytes(bucket, key))

        payload = {
            "title": report.title,
            "summary": report.title,
            "tlp": self.tlp,
            "category": self.category,
            "sub_category": self.subcategory,
            "is_vip": False,
            "topics": [],
            "content": joint_md,
            "content_structure": platejs,
        }

        response = requests.post(
            f"{settings.CATALYST_HOST}/api/posts/editor-contents/",
            headers={"Authorization": "Token " + report.user.catalyst_api_key},
            json=payload,
        )
        if response.status_code == 201:
            published_post_id = response.json()["id"]
            err = self.create_references(published_post_id, entry_map, report.user)
            if err:
                report.error_message = err
                report.status = ReportStatus.ERROR
                report.save()
                return False

            report.external_ref = published_post_id
            report.save()

            return True
        report.error_message = response.text
        report.status = ReportStatus.ERROR
        report.save()
        return False

    def delete_report(self, report: PublishedReport) -> bool:
        """Delete the report from Catalyst via API."""
        if not report.user or not report.user.catalyst_api_key:
            report.error_message = "User has no Catalyst API key"
            report.status = ReportStatus.ERROR
            report.save()
            return False

        response = requests.delete(
            f"{settings.CATALYST_HOST}/api/posts/editor-contents/{report.external_ref}/",
            headers={"Authorization": "Token " + report.user.catalyst_api_key},
        )

        if response.status_code == 404:
            return True

        if response.status_code != 204:
            report.error_message = response.text
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

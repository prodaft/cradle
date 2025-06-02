from typing import Dict, Optional, Iterable
import requests
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from user.models import CradleUser
from django.conf import settings
from notes.markdown.to_platejs import markdown_to_pjs
from file_transfer.utils import MinioClient
from entries.models import Entry
from .base import BasePublishStrategy
from intelio.models.mappings.catalyst import CatalystMapping
from entries.models import EntryClass


class CatalystPublish(BasePublishStrategy):
    def __init__(
        self, tlp: str, category: str, subcategory: str, anonymized: bool
    ) -> None:
        super().__init__(anonymized)
        self.category = category
        self.subcategory = subcategory
        self.tlp = tlp
        self.typemapping: dict[EntryClass, CatalystMapping] = (
            CatalystMapping.get_typemapping()
        )

    def get_remote_url(self, report: PublishedReport) -> str:
        """
        Get the remote URL of the published report.
        """
        if not report.external_ref:
            raise ValueError("Report does not have an external reference.")
        return "https://catalyst.prodaft.com/publications/review/" + report.external_ref

    def get_entity(
        self, catalyst_type: CatalystMapping, name: str, user: CradleUser
    ) -> Optional[Dict[str, Optional[str]]]:
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
                    "level": catalyst_type.level.upper(),
                    "value": data.get("value") or data.get("name"),
                }
                return res

        if response.status_code == 200:
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
                    "level": catalyst_type.level.upper(),
                }
                return res
        return None

    def create_references(self, post_id: str, refs, user: CradleUser) -> Optional[str]:
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
            settings.CATALYST_HOST + "/api/posts/references/bulk/",
            headers={"Authorization": "Token " + user.catalyst_api_key},
            json={"post": post_id, "references": references},
        )
        if response.status_code == 201:
            return None
        else:
            return (
                f"Failed to create references: {response.status_code} {response.text}"
            )

    def generate_access_link(self, external_ref: str, user: CradleUser) -> str:
        return f"https://catalyst.prodaft.com/publications/review/{external_ref}"

    def edit_report(self, report: PublishedReport) -> bool:
        return self.delete_report(report) and self.create_report(report)

    def create_report(self, report: PublishedReport) -> bool:
        if not report.user.catalyst_api_key:
            report.error_message = "User has no Catalyst API key"
            report.status = ReportStatus.ERROR
            report.save()
            return False

        report.extra_data = report.extra_data or {}
        report.extra_data["warnings"] = []

        # Use anonymized note content if enabled.
        joint_md = "\n-----\n".join(
            self._anonymize_note(note).content for note in report.notes.all()
        )
        entries: Iterable[Entry] = Note.objects.get_entries_from_notes(
            report.notes.all()
        )
        entry_map = {}
        for i in entries:
            # Anonymize the entry before processing.
            anonymized_entry = self._anonymize_entry(i)
            if self.typemapping[i.entry_class] is None:
                continue

            entity = self.get_entity(
                self.typemapping[i.entry_class], anonymized_entry.name, report.user
            )

            key = (i.entry_class.subtype, anonymized_entry.name)
            if entity:
                entry_map[key] = entity
            else:
                if anonymized_entry.name != i.name:
                    report.extra_data["warnings"].append(
                        f"Failed to link entry {i.entry_class.subtype}:{i.name + f'({anonymized_entry.name})'}"
                    )
                else:
                    report.extra_data["warnings"].append(
                        f"Failed to link entry {i.entry_class.subtype}:{i.name}"
                    )

        footnotes = {}
        for note in report.notes.all():
            for f in note.files.all():
                footnotes[f.minio_file_name] = (f.bucket_name, f.minio_file_name)

        platejs = markdown_to_pjs(
            joint_md, entry_map, footnotes, MinioClient().fetch_file
        )

        payload = {
            "title": report.title,
            "summary": report.title,
            "tlp": self.tlp,
            "category": "RESEARCH",
            "sub_category": "732c67b9-2a1b-44de-b99f-f7f580a5fbb7",
            "is_vip": False,
            "topics": [],
            "content": joint_md,
            "content_structure": platejs,
        }

        response = requests.post(
            settings.CATALYST_HOST + "/api/posts/editor-contents/",
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
        else:
            report.error_message = response.text
            report.status = ReportStatus.ERROR
            report.save()
            return False

    def delete_report(self, report: PublishedReport) -> bool:
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

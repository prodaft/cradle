from typing import Dict, Optional, Iterable, List
import requests
from notes.models import Note
from user.models import CradleUser
from django.conf import settings
from notes.markdown.platejs_render import markdown_to_pjs
from file_transfer.utils import MinioClient
from entries.models import Entry
from .base import BasePublishStrategy, PublishResult


class CatalystPublish(BasePublishStrategy):
    def __init__(
        self, tlp: str, category: str, subcategory: str, anonymized: bool
    ) -> None:
        super().__init__(anonymized)
        self.category = category
        self.subcategory = subcategory
        self.tlp = tlp

    def get_entity(
        self, catalyst_type: str, name: str, user: CradleUser
    ) -> Optional[Dict[str, Optional[str]]]:
        if not catalyst_type:
            return None

        foo = catalyst_type.split("|")
        catalyst_type = foo[0]
        model_class = foo[1] if len(foo) > 1 else None
        level = foo[2] if len(foo) > 2 else "STRATEGIC"

        catalyst_types = catalyst_type.split("/")
        ctype = catalyst_types[0]
        csubtype = "/".join(catalyst_types[1:]) if len(catalyst_types) > 1 else None

        url = f"{settings.CATALYST_HOST}/api/{ctype}/"
        params = {"type": csubtype, "value": name} if csubtype else {"name": name}

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
                    "type": model_class or ctype,
                    "level": level,
                    "value": data.get("value") if csubtype else data.get("name"),
                }
                return res

        if response.status_code == 200 and csubtype:
            response = requests.post(
                url,
                json=params,
                headers={"Authorization": "Token " + user.catalyst_api_key},
            )
            if response.status_code == 201:
                data = response.json()
                res = {
                    "id": data["id"],
                    "type": model_class or ctype,
                    "value": data["value"],
                    "level": level,
                }
                return res
        return None

    def create_references(self, post_id: str, refs, user: CradleUser) -> Optional[str]:
        references = []
        for entity in refs.values():
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

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        return f"https://catalyst.prodaft.com/publications/review/{report_location}"

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        result = self.delete_report(report_location, user)
        if not result.success:
            return result

        return self.create_report(title, notes, user)

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        if not user.catalyst_api_key:
            return PublishResult(
                success=False, error="User does not have a Catalyst API key"
            )

        # Use anonymized note content if enabled.
        joint_md = "\n-----\n".join(
            self._anonymize_note(note).content for note in notes
        )
        entries: Iterable[Entry] = Note.objects.get_entries_from_notes(notes)
        entry_map = {}
        for i in entries:
            # Anonymize the entry before processing.
            anonymized_entry = self._anonymize_entry(i)
            key = (i.entry_class.subtype, anonymized_entry.name)
            entity = self.get_entity(
                i.entry_class.catalyst_type, anonymized_entry.name, user
            )
            if entity:
                entry_map[key] = entity

        footnotes = {}
        for note in notes:
            for f in note.files.all():
                footnotes[f.minio_file_name] = (f.bucket_name, f.minio_file_name)

        platejs = markdown_to_pjs(
            joint_md, entry_map, footnotes, MinioClient().fetch_file
        )

        payload = {
            "title": title,
            "summary": title,
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
            headers={"Authorization": "Token " + user.catalyst_api_key},
            json=payload,
        )
        if response.status_code == 201:
            published_post_id = response.json()["id"]
            err = self.create_references(published_post_id, entry_map, user)
            if err:
                return PublishResult(success=False, error=err)
            return PublishResult(
                success=True,
                data=published_post_id,
            )
        else:
            return PublishResult(
                success=False,
                error=f"Failed to create publication: {response.status_code} {response.json()}",
            )

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        response = requests.delete(
            f"{settings.CATALYST_HOST}/api/posts/editor-contents/{report_location}/",
            headers={"Authorization": "Token " + user.catalyst_api_key},
        )

        if response.status_code == 404:
            return PublishResult(success=True, data="Report not found")

        if response.status_code != 204:
            return PublishResult(
                success=False,
                error=f"Failed to delete publication: {response.status_code} {response.text}",
            )

        return PublishResult(success=True, data=f"Deleted: {report_location}")

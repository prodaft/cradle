from django.urls import reverse
from access.models import Access
from access.enums import AccessType
from rest_framework_simplejwt.tokens import AccessToken

from notes import utils
from ..models import Note
from entries.models import Entry
from entries.enums import EntryType
from .utils import NotesTestCase
from unittest.mock import patch
import notes.processor.entry_population_task as task


class CreateNoteTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.saved_entity = Entry.objects.create(
            name="entity", entry_class=self.entryclass1
        )
        self.saved_actor = Entry.objects.create(
            name="actor", entry_class=self.entryclass2
        )

        self.file_name = "evidence.png"
        self.minio_file_name = "aad5cae6-5737-409d-8ce2-5f116ed5e2de-evidence.png"
        self.bucket_name = str(self.user.id)

        self.file_exists_patcher = patch(
            "file_transfer.utils.MinioClient.file_exists_at_path"
        )
        self.mocked_file_exists = self.file_exists_patcher.start()

        def mocked_file_exists_call(bucket_name, minio_file_name):
            if (
                bucket_name == self.bucket_name
                and minio_file_name == self.minio_file_name
            ):
                return True
            else:
                return False

        self.mocked_file_exists.side_effect = mocked_file_exists_call
        self.file_reference = {
            "minio_file_name": self.minio_file_name,
            "file_name": self.file_name,
            "bucket_name": self.bucket_name,
        }
        task.extract_links = utils.extract_links

    def tearDown(self):
        super().tearDown()
        self.file_exists_patcher.stop()

    def test_create_note_no_content(self):
        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference]},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "The note should not be empty.")

    def test_create_note_empty_content(self):
        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": ""},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "The note should not be empty.")

    def test_create_note_wrong_bucket_name(self):
        Access.objects.create(
            user=self.user, entity=self.saved_entity, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[entity:entity]] [[ip:127.0.0.1]]"
        self.file_reference["bucket_name"] = "wrong_name"

        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": note_content},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "The bucket name of the file reference is incorrect",
        )

    def test_create_note_wrong_minio_file_name(self):
        Access.objects.create(
            user=self.user, entity=self.saved_entity, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[entity:entity]] [[ip:127.0.0.1]]"
        self.file_reference["minio_file_name"] = "wrong_name"

        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": note_content},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "There exists no file at the specified path"
        )

    def test_create_note_not_authenticated(self):
        Access.objects.create(
            user=self.user, entity=self.saved_entity, access_type=AccessType.READ_WRITE
        )
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[entity:entity]]",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_does_not_reference_enough_entries(self):
        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": "Lorem ipsum"},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Note does not reference at least 1 entity and at least 2 entries.",
        )

    def test_references_entries_that_do_not_exist(self):
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[case:wrongentity]]",
            },
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "Some of the referenced entries do not exist or you don't have the right permissions to access them:\n(case: wrongentity)",
        )

    def test_references_entities_user_has_no_access_to(self):
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[case:entity]]",
            },
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "Some of the referenced entries do not exist or you don't have the right permissions to access them:\n(case: entity)",
        )

    def test_create_note_successfully(self):
        Access.objects.create(
            user=self.user, entity=self.saved_entity, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[case:entity]] [[ip:127.0.0.1]]"

        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": note_content},
            content_type="application/json",
            **self.headers,
        )

        saved_note = Note.objects.first()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["content"], note_content)
        self.assertEqual(response.json()["files"], [self.file_reference])
        self.assertEqual(saved_note.content, note_content)
        self.assertIsNotNone(response.json()["timestamp"])

        referenced_entries = saved_note.entries.all()
        # this also checks that the ip entry has been successfully created
        saved_artifact = Entry.objects.get(
            name="127.0.0.1", entry_class=self.entryclass_ip
        )
        self.assertCountEqual(
            referenced_entries, [self.saved_entity, self.saved_actor, saved_artifact]
        )

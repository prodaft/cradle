from django.urls import reverse
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType
from rest_framework_simplejwt.tokens import AccessToken
from ..models import Note
from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from .utils import NotesTestCase
from unittest.mock import patch


class CreateNoteTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.saved_case = Entity.objects.create(name="case", type=EntityType.CASE)
        self.saved_actor = Entity.objects.create(name="actor", type=EntityType.ACTOR)

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
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[case:case]] [[ip:127.0.0.1]]"
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
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[case:case]] [[ip:127.0.0.1]]"
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
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[case:case]]",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_does_not_reference_enough_entities(self):
        response = self.client.post(
            reverse("note_list"),
            {"files": [self.file_reference], "content": "Lorem ipsum"},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Note does not reference at least one case and at least two entities.",
        )

    def test_references_entities_that_do_not_exist(self):
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[case:wrongcase]]",
            },
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced actors or cases do not exist."
        )

    def test_references_cases_user_has_no_access_to(self):
        response = self.client.post(
            reverse("note_list"),
            {
                "files": [self.file_reference],
                "content": "Lorem ipsum [[actor:actor]] [[case:case]]",
            },
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced actors or cases do not exist."
        )

    def test_create_note_successfully(self):
        Access.objects.create(
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[case:case]] [[ip:127.0.0.1]]"

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

        referenced_entities = saved_note.entities.all()
        # this also checks that the ip entity has been successfully created
        saved_entry = Entity.objects.get(
            name="127.0.0.1", type=EntityType.ENTRY, subtype=EntitySubtype.IP
        )
        self.assertCountEqual(
            referenced_entities, [self.saved_case, self.saved_actor, saved_entry]
        )

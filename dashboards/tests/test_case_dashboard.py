from django.test import TestCase
from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from entities.models import Entity
from entities.enums import EntityType
from access.models import Access
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetCaseDashboardTest(TestCase):

    def check_note_ids(self, notes, notes_json):
        with self.subTest("Check number of notes"):
            self.assertEqual(len(notes), len(notes_json))

        for i in range(0, len(notes_json)):
            with self.subTest("Check note id"):
                note = notes_json[i]
                self.assertEqual(note["id"], notes[i].id)

    def check_case_ids(self, cases, cases_json):
        with self.subTest("Check number of cases"):
            self.assertEqual(len(cases), len(cases_json))

        for i in range(0, len(cases_json)):
            with self.subTest("Check case id"):
                case = cases_json[i]
                self.assertEqual(case["id"], cases[i].id)

    def check_actor_ids(self, actors, actors_json):
        with self.subTest("Check number of actors"):
            self.assertEqual(len(actors), len(actors_json))

        for i in range(0, len(actors_json)):
            with self.subTest("Check actor id"):
                actor = actors_json[i]
                self.assertEqual(actor["id"], actors[i].id)

    def check_metadata_ids(self, metadata, metadata_json):
        with self.subTest("Check number of metadata"):
            self.assertEqual(len(metadata), len(metadata_json))

        for i in range(0, len(metadata_json)):
            with self.subTest("Check metadata id"):
                metadata_response = metadata_json[i]
                self.assertEqual(metadata_response["id"], metadata[i].id)

    def check_entry_ids(self, entries, entries_json):
        with self.subTest("Check number of entries"):
            self.assertEqual(len(entries), len(entries_json))

        for i in range(0, len(entries_json)):
            with self.subTest("Check entry id"):
                entry = entries_json[i]
                self.assertEqual(entry["id"], entries[i].id)

    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", is_staff=True
        )
        self.user1 = CradleUser.objects.create_user(
            username="user1", password="password", is_staff=False
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2", password="password", is_staff=False
        )

    def create_tokens(self):
        self.token_user2 = str(AccessToken.for_user(self.user2))
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_user1 = str(AccessToken.for_user(self.user1))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_user1 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user1}"}
        self.headers_user2 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user2}"}

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.add(self.case1, self.actor1, self.metadata1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.user1, case=self.case2, access_type="read"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

        self.access4 = Access.objects.create(
            user=self.user2, case=self.case2, access_type="none"
        )

    def setUp(self):
        self.client = APIClient()

        self.create_users()

        self.create_tokens()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_access()

        self.create_notes()

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.all().order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE).exclude(id=self.case1.id)
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read-write")

        self.check_note_ids(notes, json_response["notes"])

        self.check_case_ids(cases, json_response["cases"])

        self.check_actor_ids(actors, json_response["actors"])

        self.check_metadata_ids(metadata, json_response["metadata"])

        self.check_entry_ids(entries, json_response["entries"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.none()
        actors = Entity.objects.filter(id=self.actor1.id)
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.filter(type=EntityType.ENTRY)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        with self.subTest("Check case access"):
            self.assertEqual(json_response["access"], "read")

        self.check_note_ids(notes, json_response["notes"])

        self.check_case_ids(cases, json_response["cases"])

        self.check_actor_ids(actors, json_response["actors"])

        self.check_metadata_ids(metadata, json_response["metadata"])

        self.check_entry_ids(entries, json_response["entries"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.all().order_by("-timestamp")
        cases = Entity.objects.filter(id=self.case2.id)
        actors = Entity.actors.all()
        metadata = Entity.metadata.all()
        entries = Entity.entries.all()

        json_response = bytes_to_json(response.content)

        with self.subTest("Check case id"):
            self.assertEqual(json_response["id"], self.case1.id)

        self.assertEqual(json_response["access"], "read-write")

        self.check_note_ids(notes, json_response["notes"])

        self.check_case_ids(cases, json_response["cases"])

        self.check_actor_ids(actors, json_response["actors"])

        self.check_metadata_ids(metadata, json_response["metadata"])

        self.check_entry_ids(entries, json_response["entries"])

    def test_get_dashboard_user_no_access(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": self.case2.name}),
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_case(self):
        response = self.client.get(
            reverse("case_dashboard", kwargs={"case_name": "Case"}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

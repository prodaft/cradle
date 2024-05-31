from django.test import TestCase
from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from entities.models import Entity
from entities.enums import EntityType, EntrySubtype
from access.models import Access
from notes.models import Note


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetEntryDashboardTest(TestCase):

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
        self.note1.entities.add(
            self.case1, self.actor1, self.metadata1, self.entry1, self.entry2
        )

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1, self.entry1)

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

    def create_entries(self):
        self.entry1 = Entity.objects.create(
            name="Entry1",
            description="Description1",
            type=EntityType.ENTRY,
            subtype=EntrySubtype.IP,
        )

        self.entry2 = Entity.objects.create(
            name="Entry1",
            description="Description1",
            type=EntityType.ENTRY,
            subtype=EntrySubtype.URL,
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

        self.create_entries()

        self.create_notes()

    def test_get_dashboard_admin(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": EntrySubtype.IP},
            **self.headers_admin,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE)

        json_response = bytes_to_json(response.content)

        self.check_note_ids(notes, json_response["notes"])
        self.check_case_ids(cases, json_response["cases"])

    def test_get_dashboard_user_read_access(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": EntrySubtype.IP},
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.filter(id=self.case1.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("ip", json_response["subtype"])

        self.check_note_ids(notes, json_response["notes"])
        self.check_case_ids(cases, json_response["cases"])

    def test_get_dashboard_user_read_write_access(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": EntrySubtype.IP},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.order_by("-timestamp")
        cases = Entity.objects.filter(type=EntityType.CASE)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("ip", json_response["subtype"])

        self.check_note_ids(notes, json_response["notes"])
        self.check_case_ids(cases, json_response["cases"])

    def test_get_dashboard_user_no_access_to_a_case(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": EntrySubtype.IP},
            **self.headers_user2,
        )
        self.assertEqual(response.status_code, 200)

        notes = Note.objects.filter(id=self.note1.id)
        cases = Entity.objects.filter(id=self.case1.id)

        json_response = bytes_to_json(response.content)

        with self.subTest("Check subtype"):
            self.assertEqual("ip", json_response["subtype"])

        self.check_note_ids(notes, json_response["notes"])
        self.check_case_ids(cases, json_response["cases"])

    def test_get_dashboard_invalid_entry(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": "Case"}),
            {"subtype": EntrySubtype.IP},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_dashboard_invalid_entry_subtype(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            {"subtype": "invalid"},
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

    def test_get_dashboard_no_subtype_provided(self):
        response = self.client.get(
            reverse("entry_dashboard", kwargs={"entry_name": self.entry1.name}),
            **self.headers_user1,
        )
        self.assertEqual(response.status_code, 400)

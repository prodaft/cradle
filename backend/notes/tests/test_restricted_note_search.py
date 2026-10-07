"""Tests for restricted notes in note search (GET /notes/?search=...&include_restricted=true)."""

import json

from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from access.models import Access
from entries.models import Entry
from logs.enums import EventType
from logs.models import EventLog
from management.models import Setting
from notifications.models import AccessRequestNotification
from user.models import CradleUser, UserRoles

from ..models import Note
from ..utils import calculate_acvec
from .utils import NotesTestCase


class RestrictedNoteSearchTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        # Settings and throttle counters live in the local-memory cache, which outlives each test's transaction.
        cache.clear()
        self.addCleanup(cache.clear)

        self.author = CradleUser.objects.create_user(username="author2", password="password", email="a2@x.y")
        self.admin = CradleUser.objects.create_user(
            username="admin", password="password", email="admin@x.y", role=UserRoles.ADMIN
        )

        self.case_open = Entry.objects.create(name="Open case", entry_class=self.entryclass1)
        self.case_closed = Entry.objects.create(name="Closed case", entry_class=self.entryclass1)
        Access.objects.create(user=self.user, entity=self.case_open, access_type="read")

        self.open_note = self.published_note("# Open\n1.1.1.1 seen in the open case", self.case_open)
        self.closed_note = self.published_note("# Closed\n1.1.1.1 seen in the falcon case", self.case_closed)
        self.draft = Note.objects.create(content="1.1.1.1 draft", author=self.author, fleeting=True)

        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def published_note(self, content, case):
        note = Note.objects.create(
            content=content, title=content.splitlines()[0].lstrip("# "), author=self.author, fleeting=False
        )
        note.entries.set([case])
        note.access_vector = calculate_acvec([case])
        note.save()
        return note

    def enable(self, value=True):
        Setting.objects.update_or_create(key="search.reveal_restricted_matches", defaults={"value": value})
        # Setting's lifecycle hooks don't run (Model precedes LifecycleModelMixin), so drop the cached value here.
        cache.delete("setting:search.reveal_restricted_matches")

    def search(self, term, **params):
        return self.client.get(reverse("note_list"), {"search": term, "include_restricted": "true", **params})

    def rows(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def ids(self, response):
        return [row["id"] for row in self.rows(response)]

    def restricted(self, note):
        note.refresh_from_db()
        return {
            "id": str(note.id),
            "accessible": False,
            "created_at": note.timestamp.isoformat(),
            "updated_at": note.edit_timestamp.isoformat() if note.edit_timestamp else None,
        }

    def test_restricted_note_listed_after_accessible_ones(self):
        self.enable()
        rows = self.rows(self.search("1.1.1.1"))
        self.assertEqual([row["id"] for row in rows], [str(self.open_note.id), str(self.closed_note.id)])
        self.assertIs(rows[0]["accessible"], True)
        self.assertIn("content", rows[0])
        self.assertEqual(rows[1], self.restricted(self.closed_note))

    def test_plain_text_and_phrases_match(self):
        self.enable()
        for term in ["falcon", '"falcon case"', "1.1.1.1 AND falcon", "1.1.1.1 falcon", "=Closed"]:
            with self.subTest(term=term):
                self.assertIn(self.restricted(self.closed_note), self.rows(self.search(term)))

    def test_broad_or_short_searches_reveal_nothing(self):
        self.enable()
        for term in ["*falcon*", "falcon OR zzz", "-zzz", "NOT zzz", "fa", "1.1.1.1 AND fa"]:
            with self.subTest(term=term):
                self.assertNotIn(str(self.closed_note.id), self.ids(self.search(term)))

    def test_author_name_is_not_searched(self):
        self.enable()
        self.assertNotIn(str(self.closed_note.id), self.ids(self.search("author2")))

    def test_drafts_are_never_reported(self):
        self.enable()
        self.assertNotIn(str(self.draft.id), self.ids(self.search("draft")))

    def test_other_filters_disable_restricted_notes(self):
        self.enable()
        for params in [
            {"status": "finalized"},
            {"author": "author2"},
            {"content": "1.1.1.1"},
            {"linked_to": str(self.case_open.id)},
        ]:
            with self.subTest(params=params):
                self.assertNotIn(str(self.closed_note.id), self.ids(self.search("1.1.1.1", **params)))

    def test_setting_off_reveals_nothing(self):
        self.assertEqual(self.ids(self.search("1.1.1.1")), [str(self.open_note.id)])
        self.enable(False)
        self.assertEqual(self.ids(self.search("1.1.1.1")), [str(self.open_note.id)])

    def test_without_parameter_reveals_nothing(self):
        self.enable()
        response = self.client.get(reverse("note_list"), {"search": "1.1.1.1"})
        self.assertEqual(self.ids(response), [str(self.open_note.id)])

    def test_admin_gets_full_notes(self):
        self.enable()
        self.client.force_authenticate(self.admin)
        rows = self.rows(self.search("1.1.1.1"))
        self.assertEqual({row["id"] for row in rows}, {str(self.open_note.id), str(self.closed_note.id)})
        self.assertTrue(all(row["accessible"] for row in rows))

    def test_gaining_access_shows_full_note(self):
        self.enable()
        Access.objects.create(user=self.user, entity=self.case_closed, access_type="read")
        self.user.refresh_from_db()
        rows = {row["id"]: row for row in self.rows(self.search("falcon"))}
        self.assertIs(rows[str(self.closed_note.id)]["accessible"], True)

    def test_count_and_pages_include_restricted_notes(self):
        self.enable()
        first = self.search("1.1.1.1", page_size=1)
        self.assertEqual(first.json()["count"], 2)
        self.assertEqual(first.json()["total_pages"], 2)
        second = self.search("1.1.1.1", page_size=1, page=2)
        self.assertEqual(self.rows(second), [self.restricted(self.closed_note)])

    def test_logged_against_user_not_note(self):
        self.enable()
        self.search("1.1.1.1")
        log = EventLog.objects.get(user=self.user, type=EventType.FETCH)
        self.assertEqual(log.content_type, ContentType.objects.get_for_model(CradleUser))
        self.assertEqual(log.object_id, str(self.user.id))
        self.assertEqual(
            json.loads(log.details), {"reason": "restricted_note_search", "notes": [str(self.closed_note.id)]}
        )
        self.assertFalse(EventLog.objects.filter(object_id=str(self.closed_note.id)).exists())

    def detail(self, note_id):
        return self.client.get(reverse("note_detail", kwargs={"note_id": note_id}))

    def test_detail_returns_403_for_restricted_note(self):
        self.enable()
        self.assertEqual(self.detail(self.closed_note.id).status_code, 403)

    def test_detail_returns_404_when_setting_off(self):
        self.assertEqual(self.detail(self.closed_note.id).status_code, 404)

    def test_detail_returns_404_for_drafts_and_unknown_notes(self):
        self.enable()
        self.assertEqual(self.detail(self.draft.id).status_code, 404)
        self.assertEqual(self.detail("00000000-0000-0000-0000-000000000000").status_code, 404)

    def request_access(self, note_id):
        return self.client.post(reverse("note_request_access", kwargs={"note_id": note_id}))

    def test_request_access_notifies_managers_not_owners(self):
        self.enable()
        owner = CradleUser.objects.create_user(username="owner", password="password", email="o@x.y")
        Access.objects.create(user=owner, entity=self.case_closed, access_type="read-write")
        manager = CradleUser.objects.create_user(
            username="manager", password="password", email="m@x.y", role=UserRoles.MANAGER
        )

        self.assertEqual(self.request_access(self.closed_note.id).status_code, 201)
        self.assertFalse(AccessRequestNotification.objects.filter(user=owner).exists())
        notification = AccessRequestNotification.objects.get(user=manager)
        self.assertEqual(notification.requesting_user, self.user)
        self.assertEqual(notification.entity, self.case_closed)
        self.assertIn('read note "Closed"', notification.message)

    def test_request_access_skips_cases_user_can_access(self):
        self.enable()
        both = self.published_note("# Both\nshared", self.case_closed)
        both.entries.add(self.case_open)

        self.request_access(both.id)
        # Every admin and manager is notified, so check which entities were requested.
        self.assertEqual(
            set(AccessRequestNotification.objects.values_list("entity_id", flat=True)), {self.case_closed.id}
        )

    def test_request_access_for_readable_note_sends_nothing(self):
        self.enable()
        self.assertEqual(self.request_access(self.open_note.id).status_code, 201)
        self.assertFalse(AccessRequestNotification.objects.exists())

    def test_request_access_unavailable_when_setting_off_or_draft(self):
        self.assertEqual(self.request_access(self.closed_note.id).status_code, 404)
        self.enable()
        self.assertEqual(self.request_access(self.draft.id).status_code, 404)
        self.assertFalse(AccessRequestNotification.objects.exists())

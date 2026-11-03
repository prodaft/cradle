"""Graph queries must respect each relation's access vector and treat only aliases as the same entry."""

from unittest.mock import patch

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation, calculate_acvec
from entries.tasks import update_accesses
from notes.models import Note
from user.models import CradleUser
from user.testing import session_access_token

from .utils import GraphTestCase


class GraphAccessTest(GraphTestCase):
    def setUp(self):
        super().setUp()
        self.ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        self.user = CradleUser.objects.create_user(username="analyst", password="password", email="u@c.d")
        self.user_headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}

    def artifact(self, name):
        return Entry.objects.create(name=name, entry_class=self.ip)

    def grant(self, *entities):
        for entity in entities:
            Access.objects.create(user=self.user, entity=entity, access_type=AccessType.READ)

    def note_linking(self, artifact, *entities):
        """Relations a published note mentioning ``artifact`` and ``entities`` creates for its artifact."""
        note = Note.objects.create(
            content="x", author=self.admin, fleeting=False, access_vector=calculate_acvec(entities)
        )
        note.entries.add(artifact, *entities)
        for entity in entities:
            Relation.objects.create(
                e1=entity,
                e2=artifact,
                object_id=note.pk,
                content_type=ContentType.objects.get_for_model(Note),
                reason=RelationReason.NOTE,
                access_vector=note.access_vector,
            )

    def neighbor_ids(self, src, headers, depth=1):
        response = self.client.get(reverse("graph_neighbors_query"), {"src": src.id, "depth": depth}, **headers)
        self.assertEqual(response.status_code, 200, response.content)
        return {entry["id"] for entry in response.json()["results"]}

    def full_graph_ids(self, headers):
        data = self.client.get(reverse("knowledge_graph"), **headers).json()
        return {entry["id"] for group in data["entries"].values() for entries in group.values() for entry in entries}

    def test_pair_seen_only_in_unreadable_notes_is_hidden(self):
        x, y, z = self.entity("x"), self.entity("y"), self.entity("z")
        ip = self.artifact("1.1.1.1")
        self.grant(x)
        self.note_linking(ip, x, y)
        self.note_linking(ip, x, z)
        self.refresh_edges()

        self.assertNotIn(ip.id, self.neighbor_ids(x, self.user_headers))
        self.assertNotIn(ip.id, self.full_graph_ids(self.user_headers))

    def test_pair_seen_in_one_readable_note_is_shown(self):
        x, y, z = self.entity("x"), self.entity("y"), self.entity("z")
        ip = self.artifact("1.1.1.1")
        self.grant(x, y)
        self.note_linking(ip, x, y)
        self.note_linking(ip, x, z)
        self.refresh_edges()

        self.assertIn(ip.id, self.neighbor_ids(x, self.user_headers))
        self.assertIn(ip.id, self.full_graph_ids(self.user_headers))

    def test_alias_of_restricted_entity_is_hidden(self):
        secret, known = self.entity("secret"), self.entity("known")
        alias = self.artifact("9.9.9.9")
        self.grant(known)
        self.note_linking(alias, known)
        secret.aliases.add(alias)
        secret.reconnect_aliases()
        self.refresh_edges()

        self.assertNotIn(secret.id, self.neighbor_ids(alias, self.user_headers))
        self.assertIn(secret.id, self.neighbor_ids(alias, self.headers))

    def test_alias_follows_entity_made_public(self):
        secret, known = self.entity("secret"), self.entity("known")
        alias = self.artifact("9.9.9.9")
        self.grant(known)
        self.note_linking(alias, known)
        secret.aliases.add(alias)
        secret.reconnect_aliases()
        secret.is_public = True
        secret.save()
        with patch("core.decorators.close_old_connections"):
            update_accesses(secret.id)
        self.refresh_edges()

        self.assertIn(secret.id, self.neighbor_ids(alias, self.user_headers))

    def test_alias_neighbors_are_followed_beyond_the_first_hop(self):
        x, y, c = self.entity("x"), self.entity("y"), self.entity("c")
        alias = self.artifact("9.9.9.9")
        self.link(x, y)
        y.aliases.add(alias)
        y.reconnect_aliases()
        self.link(c, alias)
        self.refresh_edges()

        self.assertIn(c.id, self.neighbor_ids(x, self.headers, depth=2))

    def test_full_graph_has_one_edge_per_pair(self):
        x, y = self.entity("x"), self.entity("y")
        ip = self.artifact("1.1.1.1")
        self.note_linking(ip, x)
        self.note_linking(ip, x, y)

        data = self.client.get(reverse("knowledge_graph"), **self.headers).json()

        ip_relations = [r for r in data["relations"] if ip.id in (r["src"], r["dst"]) and x.id in (r["src"], r["dst"])]
        self.assertEqual(len(ip_relations), 1)
        self.assertEqual(data["entries"]["artifacts"]["ip"][0]["degree"], 2)

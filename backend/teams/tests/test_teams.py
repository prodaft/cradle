import uuid
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from notifications.models import AccessRequestNotification, TeamMembershipNotification
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import TeamRole
from ..models import Team, TeamAccess, TeamMembership


class TeamsTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

        self.entry_class = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")
        self.entity = Entry.objects.create(name="entity", entry_class=self.entry_class)
        self.other_entity = Entry.objects.create(name="other", entry_class=self.entry_class)

        self.admin = CradleUser.objects.create_superuser(username="admin", password="pw", email="admin@x.y")
        self.lead = self._user("lead", UserRoles.MANAGER)
        self.other_lead = self._user("otherlead", UserRoles.MANAGER)
        self.manager = self._user("manager", UserRoles.MANAGER)
        self.member = self._user("member")
        self.outsider = self._user("outsider")

        self.team = Team.objects.create(name="Red")
        self.other_team = Team.objects.create(name="Blue")
        TeamMembership.objects.create(team=self.team, user=self.lead, role=TeamRole.LEAD)
        TeamMembership.objects.create(team=self.team, user=self.member)
        TeamMembership.objects.create(team=self.other_team, user=self.other_lead, role=TeamRole.LEAD)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def _user(self, name, role=UserRoles.USER):
        return CradleUser.objects.create_user(username=name, password="pw", email=f"{name}@x.y", role=role)

    def _auth(self, user):
        return {"HTTP_COOKIE": f"access_token={session_access_token(user)}"}

    def _grant(self, team, entity, access_type):
        TeamAccess.objects.update_or_create(team=team, entity=entity, defaults={"access_type": access_type})


class EffectiveAccessTest(TeamsTestCase):
    def test_team_grant_gives_members_access(self):
        self._grant(self.team, self.entity, AccessType.READ)

        self.assertTrue(Access.objects.has_access_to_entities(self.member, {self.entity}, {AccessType.READ}))
        self.assertFalse(Access.objects.has_access_to_entities(self.member, {self.entity}, {AccessType.READ_WRITE}))
        self.assertFalse(Access.objects.has_access_to_entities(self.outsider, {self.entity}, {AccessType.READ}))

    def test_access_vector_includes_team_entities(self):
        self._grant(self.team, self.entity, AccessType.READ)
        bit = 1 << self.entity.acvec_offset

        self.assertTrue(self.member._compute_access_bitmask() & bit)
        self.assertFalse(self.outsider._compute_access_bitmask() & bit)

    def test_strongest_grant_wins_across_teams_and_direct(self):
        self._grant(self.team, self.entity, AccessType.READ)
        TeamMembership.objects.create(team=self.other_team, user=self.member)
        self._grant(self.other_team, self.entity, AccessType.READ_WRITE)
        Access.objects.create(user=self.member, entity=self.entity, access_type=AccessType.NONE)

        self.assertEqual(Access.objects.effective_access_type(self.member, self.entity), AccessType.READ_WRITE)
        self.assertTrue(Access.objects.has_access_to_entities(self.member, {self.entity}, {AccessType.READ_WRITE}))

    def test_leaving_team_keeps_direct_grant(self):
        self._grant(self.team, self.entity, AccessType.READ_WRITE)
        Access.objects.create(user=self.member, entity=self.entity, access_type=AccessType.READ)
        TeamMembership.objects.filter(team=self.team, user=self.member).delete()

        self.assertEqual(Access.objects.effective_access_type(self.member, self.entity), AccessType.READ)

    def test_inaccessible_entries_respects_team_grants(self):
        self._grant(self.team, self.entity, AccessType.READ)
        entries = Entry.objects.filter(pk__in=[self.entity.pk, self.other_entity.pk])

        inaccessible = Access.objects.inaccessible_entries(self.member, entries, {AccessType.READ})
        self.assertEqual(list(inaccessible), [self.other_entity])

    def test_accessible_entity_ids_include_team_grants(self):
        self._grant(self.team, self.entity, AccessType.READ)
        ids = set(Access.objects.get_accessible_entity_ids(self.member.id))
        self.assertIn(self.entity.pk, ids)
        self.assertNotIn(self.other_entity.pk, ids)


class TeamVisibilityTest(TeamsTestCase):
    def test_author_sees_only_own_teams(self):
        response = self.client.get(reverse("team_list"), **self._auth(self.member))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([t["name"] for t in response.json()["results"]], ["Red"])
        self.assertEqual(response.json()["results"][0]["my_role"], TeamRole.MEMBER)
        self.assertEqual(response.json()["results"][0]["member_count"], 2)
        self.assertFalse(response.json()["results"][0]["can_manage"])

    def test_manager_sees_all_teams(self):
        response = self.client.get(reverse("team_list"), **self._auth(self.manager))
        self.assertEqual([t["name"] for t in response.json()["results"]], ["Blue", "Red"])

    def test_mine_filter(self):
        response = self.client.get(reverse("team_list") + "?mine=true", **self._auth(self.lead))
        results = response.json()["results"]
        self.assertEqual([t["name"] for t in results], ["Red"])
        self.assertTrue(results[0]["can_manage"])
        self.assertEqual(results[0]["member_count"], 2)

    def test_author_cannot_see_foreign_team(self):
        response = self.client.get(
            reverse("team_detail", kwargs={"team_id": self.other_team.id}), **self._auth(self.member)
        )
        self.assertEqual(response.status_code, 404)


class TeamManagementTest(TeamsTestCase):
    def test_only_admin_creates_teams(self):
        response = self.client.post(
            reverse("team_list"), {"name": "Green"}, content_type="application/json", **self._auth(self.lead)
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            reverse("team_list"), {"name": "Green"}, content_type="application/json", **self._auth(self.admin)
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Team.objects.filter(name="Green").exists())

        response = self.client.post(
            reverse("team_list"), {"name": "Green"}, content_type="application/json", **self._auth(self.admin)
        )
        self.assertEqual(response.status_code, 409)

    def test_lead_adds_member_and_member_is_notified(self):
        response = self.client.post(
            reverse("team_member_list", kwargs={"team_id": self.team.id}),
            {"user_id": str(self.outsider.id)},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(self.team.memberships.filter(user=self.outsider).exists())
        self.assertTrue(TeamMembershipNotification.objects.filter(user=self.outsider, team=self.team).exists())

        response = self.client.post(
            reverse("team_member_list", kwargs={"team_id": self.team.id}),
            {"user_id": str(self.outsider.id)},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 409)

    def test_admins_cannot_be_added_as_members(self):
        response = self.client.post(
            reverse("team_member_list", kwargs={"team_id": self.team.id}),
            {"user_id": str(self.admin.id)},
            content_type="application/json",
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(self.team.memberships.filter(user=self.admin).exists())

    def test_lead_cannot_manage_other_team(self):
        response = self.client.post(
            reverse("team_member_list", kwargs={"team_id": self.other_team.id}),
            {"user_id": str(self.outsider.id)},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)

    def test_only_admin_assigns_leads(self):
        url = reverse("team_member_list", kwargs={"team_id": self.team.id})
        response = self.client.post(
            url,
            {"user_id": str(self.manager.id), "role": "lead"},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)

        # Leads need not be managers.
        response = self.client.post(
            url,
            {"user_id": str(self.outsider.id), "role": "lead"},
            content_type="application/json",
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(self.team.is_lead(self.outsider))
        self.assertTrue(self.team.can_manage(self.outsider))

    def test_removing_members(self):
        member_url = reverse("team_member_detail", kwargs={"team_id": self.team.id, "user_id": self.lead.id})
        response = self.client.delete(member_url, **self._auth(self.member))
        self.assertEqual(response.status_code, 403)

        response = self.client.delete(member_url, **self._auth(self.lead))  # leads may leave
        self.assertEqual(response.status_code, 204)

        TeamMembership.objects.create(team=self.team, user=self.lead, role=TeamRole.LEAD)
        member_url = reverse("team_member_detail", kwargs={"team_id": self.team.id, "user_id": self.member.id})
        response = self.client.delete(member_url, **self._auth(self.lead))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(self.team.memberships.filter(user=self.member).exists())


class TeamAccessRulesTest(TeamsTestCase):
    def _put_team_access(self, actor, team, entity, access_type):
        return self.client.put(
            reverse("team_access_update", kwargs={"team_id": team.id, "entity_id": entity.id}),
            {"access_type": access_type},
            content_type="application/json",
            **self._auth(actor),
        )

    def test_lead_grants_own_team_up_to_own_level_on_unowned_entity(self):
        Access.objects.create(user=self.lead, entity=self.entity, access_type=AccessType.READ)

        response = self._put_team_access(self.lead, self.team, self.entity, AccessType.READ_WRITE)
        self.assertEqual(response.status_code, 403)

        response = self._put_team_access(self.lead, self.team, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(TeamAccess.objects.filter(team=self.team, entity=self.entity).exists())

        response = self._put_team_access(self.lead, self.team, self.entity, AccessType.NONE)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(TeamAccess.objects.filter(team=self.team, entity=self.entity).exists())

    def test_lead_cannot_grant_other_team(self):
        Access.objects.create(user=self.lead, entity=self.entity, access_type=AccessType.READ_WRITE)
        response = self._put_team_access(self.lead, self.other_team, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 403)

    def test_owning_team_leads_control_owned_entity(self):
        self.client.put(
            reverse("entity_owner", kwargs={"entity_id": self.entity.id}),
            {"team_id": str(self.team.id)},
            content_type="application/json",
            **self._auth(self.admin),
        )
        self.entity.refresh_from_db()
        self.assertEqual(self.entity.team, self.team)
        self.assertEqual(TeamAccess.objects.get(team=self.team, entity=self.entity).access_type, AccessType.READ_WRITE)

        # A foreign lead cannot pull an owned entity into their own team, even with personal access.
        Access.objects.create(user=self.other_lead, entity=self.entity, access_type=AccessType.READ_WRITE)
        response = self._put_team_access(self.other_lead, self.other_team, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 403)

        # The owning team's lead can share it with the other team.
        response = self._put_team_access(self.lead, self.other_team, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 200)

        # ...but cannot lower the owning team's own access, even as admin.
        response = self._put_team_access(self.admin, self.team, self.entity, AccessType.NONE)
        self.assertEqual(response.status_code, 403)

    def test_only_admin_sets_owner(self):
        response = self.client.put(
            reverse("entity_owner", kwargs={"entity_id": self.entity.id}),
            {"team_id": str(self.team.id)},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)


class DirectAccessRulesTest(TeamsTestCase):
    def _put_user_access(self, actor, user, entity, access_type):
        return self.client.put(
            reverse("update_access", kwargs={"user_id": user.id, "entity_id": entity.id}),
            {"access_type": access_type},
            content_type="application/json",
            **self._auth(actor),
        )

    def test_any_manager_grants_unowned_entity(self):
        response = self._put_user_access(self.manager, self.outsider, self.entity, AccessType.READ_WRITE)
        self.assertEqual(response.status_code, 200)

    def test_owned_entity_direct_grants_belong_to_owner_leads(self):
        self.entity.team = self.team
        self.entity.save()
        self._grant(self.team, self.entity, AccessType.READ_WRITE)

        response = self._put_user_access(self.manager, self.outsider, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 403)

        response = self._put_user_access(self.lead, self.outsider, self.entity, AccessType.READ)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Access.objects.effective_access_type(self.outsider, self.entity), AccessType.READ)

    def test_access_requests_go_to_owner_leads(self):
        self.entity.team = self.team
        self.entity.save()

        AccessRequestNotification.notify_granters(self.outsider, self.entity, "please")
        recipients = set(AccessRequestNotification.objects.values_list("user_id", flat=True))
        self.assertEqual(recipients, {self.lead.id})

    def test_entity_access_list_shows_team_source(self):
        self._grant(self.team, self.entity, AccessType.READ_WRITE)
        Access.objects.create(user=self.member, entity=self.entity, access_type=AccessType.READ)

        response = self.client.get(
            reverse("entity_access_list", kwargs={"entity_id": self.entity.id}), **self._auth(self.manager)
        )
        row = next(r for r in response.json()["results"] if r["user"]["username"] == "member")
        self.assertEqual(row["access_type"], AccessType.READ)
        self.assertEqual(row["team_access_type"], AccessType.READ_WRITE)
        self.assertEqual(row["effective_access_type"], AccessType.READ_WRITE)
        self.assertEqual([t["name"] for t in row["teams"]], ["Red"])


class TeamCandidatesTest(TeamsTestCase):
    def test_lead_lists_non_members_only(self):
        url = reverse("team_member_candidates", kwargs={"team_id": self.team.id})
        response = self.client.get(url, **self._auth(self.lead))
        self.assertEqual(response.status_code, 200)
        names = {u["username"] for u in response.json()["results"]}
        self.assertEqual(names, {"otherlead", "manager", "outsider"})

        response = self.client.get(url, **self._auth(self.manager))
        self.assertEqual(response.status_code, 403)


class UserTeamListTest(TeamsTestCase):
    def test_admin_lists_user_teams_with_roles(self):
        TeamMembership.objects.create(team=self.other_team, user=self.lead)
        url = reverse("user_team_list", kwargs={"user_id": self.lead.id})
        response = self.client.get(url, **self._auth(self.admin))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [(m["team"]["name"], m["role"]) for m in response.json()], [("Blue", "member"), ("Red", "lead")]
        )

        response = self.client.get(url, **self._auth(self.lead))
        self.assertEqual(response.status_code, 403)

        missing = reverse("user_team_list", kwargs={"user_id": uuid.uuid4()})
        response = self.client.get(missing, **self._auth(self.admin))
        self.assertEqual(response.status_code, 404)


class TeamSearchTest(TeamsTestCase):
    def test_members_and_access_search(self):
        response = self.client.get(
            reverse("team_member_list", kwargs={"team_id": self.team.id}) + "?search=mem*",
            **self._auth(self.lead),
        )
        self.assertEqual([m["user"]["username"] for m in response.json()["results"]], ["member"])

        self._grant(self.team, self.entity, AccessType.READ)
        self._grant(self.team, self.other_entity, AccessType.READ)
        response = self.client.get(
            reverse("team_access_list", kwargs={"team_id": self.team.id}) + "?search=other",
            **self._auth(self.lead),
        )
        self.assertEqual([a["entity"]["name"] for a in response.json()["results"]], ["other"])


class PlainUserLeadTest(TeamsTestCase):
    """Leads without the manager role: capped at their own access, and limited to their team's entities."""

    def setUp(self):
        super().setUp()
        self.lead.role = UserRoles.USER
        self.lead.save()

    def _create_entity(self, actor, name, team=None):
        body = {"name": name, "subtype": "case"}
        if team is not None:
            body["team_id"] = str(team.id)
        return self.client.post(reverse("entity_list"), body, content_type="application/json", **self._auth(actor))

    def test_lead_cannot_raise_own_access(self):
        Access.objects.create(user=self.lead, entity=self.entity, access_type=AccessType.READ)

        response = self.client.put(
            reverse("team_access_update", kwargs={"team_id": self.team.id, "entity_id": self.entity.id}),
            {"access_type": AccessType.READ_WRITE},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.put(
            reverse("update_access", kwargs={"user_id": self.lead.id, "entity_id": self.entity.id}),
            {"access_type": AccessType.READ_WRITE},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Access.objects.effective_access_type(self.lead, self.entity), AccessType.READ)

    def test_lead_creates_entity_owned_by_their_team(self):
        response = self._create_entity(self.lead, "new", self.team)
        self.assertEqual(response.status_code, 201)
        entity = Entry.entities.get(name="new")
        self.assertEqual(entity.team, self.team)
        self.assertEqual(TeamAccess.objects.get(team=self.team, entity=entity).access_type, AccessType.READ_WRITE)
        self.assertEqual(Access.objects.effective_access_type(self.member, entity), AccessType.READ_WRITE)

    def test_entity_creation_needs_a_team_the_user_leads(self):
        self.assertEqual(self._create_entity(self.lead, "a").status_code, 403)
        self.assertEqual(self._create_entity(self.lead, "b", self.other_team).status_code, 403)
        self.assertEqual(self._create_entity(self.member, "c", self.team).status_code, 403)
        self.assertEqual(self._create_entity(self.admin, "d").status_code, 201)
        self.assertFalse(Entry.entities.filter(name__in=["a", "b", "c"]).exists())

    def test_lead_cannot_create_public_entity(self):
        response = self.client.post(
            reverse("entity_list"),
            {"name": "public", "subtype": "case", "team_id": str(self.team.id), "is_public": True},
            content_type="application/json",
            **self._auth(self.lead),
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Entry.entities.filter(name="public").exists())

    def test_owning_team_lead_sees_entity_and_its_access(self):
        self.entity.team = self.team
        self.entity.save()
        self._grant(self.team, self.entity, AccessType.READ_WRITE)
        # Any reader may see the entity itself; only leads of the owning team see who has access to it.
        detail = reverse("entity_detail", kwargs={"entity_id": self.entity.id})
        self.assertEqual(self.client.get(detail, **self._auth(self.lead)).status_code, 200)
        self.assertEqual(self.client.get(detail, **self._auth(self.member)).status_code, 200)
        urls = [
            reverse("entity_access_list", kwargs={"entity_id": self.entity.id}),
            reverse("entity_team_access_list", kwargs={"entity_id": self.entity.id}),
        ]
        for url in urls:
            self.assertEqual(self.client.get(url, **self._auth(self.lead)).status_code, 200, url)
            self.assertEqual(self.client.get(url, **self._auth(self.member)).status_code, 403, url)

        other_url = reverse("entity_access_list", kwargs={"entity_id": self.other_entity.id})
        self.assertEqual(self.client.get(other_url, **self._auth(self.lead)).status_code, 403)

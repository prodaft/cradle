"""Team members hear when they are removed, when the team is deleted, and when its access changes."""

from django.urls import reverse

from access.enums import AccessType
from access.models import Access
from notifications.models import MessageNotification, TeamMembershipNotification

from .test_teams import TeamsTestCase


class TeamNotificationTest(TeamsTestCase):
    def messages(self, user):
        return list(MessageNotification.objects.filter(user=user).values_list("message", flat=True))

    def test_member_removed_by_a_lead_is_told(self):
        url = reverse("team_member_detail", kwargs={"team_id": self.team.id, "user_id": self.member.id})
        response = self.client.delete(url, **self._auth(self.lead))

        self.assertEqual(response.status_code, 204, response.content)
        self.assertEqual(self.messages(self.member), ['You were removed from team "Red".'])

    def test_member_leaving_is_not_told(self):
        url = reverse("team_member_detail", kwargs={"team_id": self.team.id, "user_id": self.member.id})
        response = self.client.delete(url, **self._auth(self.member))

        self.assertEqual(response.status_code, 204, response.content)
        self.assertEqual(self.messages(self.member), [])

    def test_deleting_a_team_tells_its_members(self):
        response = self.client.delete(
            reverse("team_detail", kwargs={"team_id": self.team.id}), **self._auth(self.admin)
        )

        self.assertEqual(response.status_code, 204, response.content)
        self.assertEqual(self.messages(self.member), ['The team "Red" was deleted.'])
        self.assertEqual(self.messages(self.lead), ['The team "Red" was deleted.'])

    def set_team_access(self, access_type):
        url = reverse("team_access_update", kwargs={"entity_id": self.entity.id, "team_id": self.team.id})
        response = self.client.put(
            url, {"access_type": access_type}, content_type="application/json", **self._auth(self.admin)
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_access_changes_tell_members_once(self):
        self.set_team_access(AccessType.READ)
        self.set_team_access(AccessType.READ)
        self.set_team_access(AccessType.NONE)

        received = list(
            TeamMembershipNotification.objects.filter(user=self.member)
            .order_by("created_at")
            .values_list("message", flat=True)
        )
        self.assertEqual(
            received,
            [
                'You now have read access to "entity" after team "Red" was updated.',
                'You lost access to "entity" after team "Red" was updated.',
            ],
        )

    def test_member_with_access_from_elsewhere_is_not_told(self):
        Access.objects.create(user=self.member, entity=self.entity, access_type=AccessType.READ_WRITE)

        self.set_team_access(AccessType.READ)

        self.assertFalse(TeamMembershipNotification.objects.filter(user=self.member).exists())

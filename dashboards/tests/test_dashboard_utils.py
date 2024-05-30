from django.test import TestCase
from user.models import CradleUser

from entities.models import Entity
from entities.enums import EntityType, MetadataSubtype
from access.models import Access
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils


class DashboardUtilsDashboardJsonTest(TestCase):

    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2", password="password", is_staff=False
        )

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

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
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=MetadataSubtype.COUNTRY,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.normal_user, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.normal_user, case=self.case2, access_type="none"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

    def setUp(self):

        self.create_users()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_access()

        self.create_notes()

    def test_get_dashboard_json(self):

        notes = Note.objects.filter(id=self.note1.id)
        actors = Entity.objects.filter(id=self.actor1.id)
        cases = Entity.objects.none()
        metadata = Entity.objects.filter(id=self.metadata1.id)
        entries = Entity.objects.none()

        dashboard_json = DashboardUtils.get_dashboard(
            user=self.normal_user, entity_id=self.case1.id
        )

        self.assertQuerySetEqual(dashboard_json["notes"], notes)
        self.assertQuerySetEqual(dashboard_json["actors"], actors)
        self.assertQuerySetEqual(dashboard_json["cases"], cases)
        self.assertQuerySetEqual(dashboard_json["metadata"], metadata)
        self.assertQuerySetEqual(dashboard_json["entries"], entries)


class AddEntityFieldsTest(TestCase):

    def test_add_entity_fields(self):
        entity = Entity.objects.create(
            name="Entity", description="Description", type=EntityType.CASE, subtype=""
        )

        expected = {
            "id": entity.id,
            "name": "Entity",
            "description": "Description",
            "type": EntityType.CASE,
            "subtype": "",
        }

        self.assertEqual(DashboardUtils.add_entity_fields(entity, {}), expected)

from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken
from .utils import EntriesTestCase

from ..models import Entry
from ..serializers import EntryResponseSerializer
from ..enums import EntryType


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetActorListTest(EntriesTestCase):

    def setUp(self):
        super().setUp()

        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_get_actors_admin(self):
        Entry.objects.create(
            name="Actor1", description="Description1", type=EntryType.ACTOR
        )
        Entry.objects.create(
            name="Actor2", description="Description2", type=EntryType.ACTOR
        )
        actors = Entry.actors.all()

        expected = EntryResponseSerializer(actors, many=True).data

        response = self.client.get(reverse("actor_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, bytes_to_json(response.content))

    def test_get_actors_authenticated_not_admin(self):
        response = self.client.get(reverse("actor_list"), **self.headers_normal)

        self.assertEqual(response.status_code, 403)

    def test_get_actors_not_authenticated(self):
        response = self.client.get(reverse("actor_list"))

        self.assertEqual(response.status_code, 401)


class PostActorListTest(EntriesTestCase):

    def setUp(self):
        super().setUp()

        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_create_actor_admin(self):
        actor_json = {"name": "actor1", "description": "description1"}

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 200)
        self.assertEqual(actor_json, bytes_to_json(response_post.content))

        self.assertEqual(Entry.objects.count(), 1)
        self.assertEqual(Entry.objects.get().name, "actor1")

    def test_create_actor_no_description_admin(self):
        actor_json = {"name": "actor1"}
        expected_json = {"name": "actor1", "description": None}

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 200)
        self.assertEqual(expected_json, bytes_to_json(response_post.content))

        self.assertEqual(Entry.objects.count(), 1)
        self.assertEqual(Entry.objects.get().name, "actor1")

    def test_create_duplicate_actor_admin(self):
        actor_json = {"name": "actor1", "description": "description1"}

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 200)

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 409)

    def test_create_invalid_actor(self):
        actor_json = {"description": "description1"}

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 400)

        self.assertRaises(
            Entry.DoesNotExist, lambda: Entry.objects.get(name="actor1")
        )

    def test_create_actor_authenticated_not_admin(self):
        actor_json = {"name": "actor1", "description": "description1"}

        response_post = self.client.post(
            reverse("actor_list"), actor_json, **self.headers_normal
        )
        self.assertEqual(response_post.status_code, 403)

    def test_create_actor_not_authenticated(self):
        actor_json = {"name": "actor1", "description": "description1"}

        response_post = self.client.post(reverse("actor_list"), actor_json)
        self.assertEqual(response_post.status_code, 401)

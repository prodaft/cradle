from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from ..models import Actor


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class DeleteActorDetailsTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = User.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def test_delete_actor_admin(self):
        actor = Actor.objects.create(name="Actor1", description="Description1")

        response = self.client.delete(
            reverse("actor_detail", kwargs={"actor_id": actor.pk}), **self.headers_admin
        )

        self.assertEqual(response.status_code, 200)

    def test_delete_actor_authenticated_not_admin(self):
        actor = Actor.objects.create(name="Actor1", description="Description1")

        response = self.client.delete(
            reverse("actor_detail", kwargs={"actor_id": actor.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_actor_not_authenticated(self):
        actor = Actor.objects.create(name="Actor1", description="Description1")

        response = self.client.delete(
            reverse("actor_detail", kwargs={"actor_id": actor.pk})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_actor_admin_wrong_id(self):
        actor = Actor.objects.create(name="Actor1", description="Description1")

        response = self.client.delete(
            reverse("actor_detail", kwargs={"actor_id": actor.pk + 1}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

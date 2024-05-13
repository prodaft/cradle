from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken

from ..models import Case
from ..serializers import CaseSerializer


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetCaseListTest(TestCase):

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

    def test_get_cases_admin(self):
        Case.objects.create(name="Case1", description="Description1")
        Case.objects.create(name="Case2", description="Description2")
        cases = Case.objects.all()

        expected = CaseSerializer(cases, many=True).data

        response = self.client.get(reverse("case_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, bytes_to_json(response.content))

    def test_get_cases_authenticated_not_admin(self):
        response = self.client.get(reverse("case_list"), **self.headers_normal)

        self.assertEqual(response.status_code, 403)

    def test_get_cases_not_authenticated(self):
        response = self.client.get(reverse("case_list"))

        self.assertEqual(response.status_code, 401)


class PostCaseListTest(TestCase):

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

    def test_create_case_admin(self):
        case_json = {"name": "case1", "description": "description1"}

        response_post = self.client.post(
            reverse("case_list"), case_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 200)
        self.assertEqual(case_json, bytes_to_json(response_post.content))

        self.assertEqual(Case.objects.count(), 1)
        self.assertEqual(Case.objects.get().name, "case1")

    def test_create_invalid_case(self):
        case_json = {"name": "case1", "des": "description1"}

        response_post = self.client.post(
            reverse("case_list"), case_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 404)

        self.assertRaises(Case.DoesNotExist, lambda: Case.objects.get(name="case1"))

    def test_create_case_authenticated_not_admin(self):
        case_json = {"name": "case1", "description": "description1"}

        response_post = self.client.post(
            reverse("case_list"), case_json, **self.headers_normal
        )
        self.assertEqual(response_post.status_code, 403)

    def test_create_case_authenticated_not_authenticated(self):
        case_json = {"name": "case1", "description": "description1"}

        response_post = self.client.post(reverse("case_list"), case_json)
        self.assertEqual(response_post.status_code, 401)

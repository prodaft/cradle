from .utils import FileTransferTestEntity
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from django.urls import reverse


class TestFileUpload(FileTransferTestEntity):

    def setUp(self):
        super().setUp()
        self.mock_minio_client_create()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.bucket_name = str(self.user.id)

    def tearDown(self):
        super().tearDown()
        self.mock_minio_client_destroy()

    def test_get_presigned_put_successfully(self):
        query_params = {"fileName": self.file_name}

        response_json = self.client.get(
            reverse("file_upload"), query_params, **self.headers
        ).json()

        self.assertEqual(response_json["bucket_name"], str(self.user.id))
        self.assertEqual(response_json["minio_file_name"], self.minio_file_name)
        self.assertEqual(response_json["presigned"], self.presigned_url)

    def test_get_presigned_put_not_authenticated(self):
        query_params = {"fileName": self.file_name}

        response = self.client.get(reverse("file_upload"), query_params)

        self.assertEqual(response.status_code, 401)

    def test_get_presigned_put_no_file_name(self):
        response = self.client.get(reverse("file_upload"), **self.headers)

        self.assertEqual(response.status_code, 400)

    def test_get_presigned_put_file_name_empty(self):
        query_params = {"fileName": ""}

        response = self.client.get(reverse("file_upload"), query_params, **self.headers)

        self.assertEqual(response.status_code, 400)

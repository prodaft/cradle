from .utils import FileTransferTestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from django.urls import reverse


class TestFileDownload(FileTransferTestCase):
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

    def test_get_presigned_get_successfully(self):
        query_params = {
            "bucketName": self.bucket_name,
            "minioFileName": self.minio_file_name,
        }

        response = self.client.get(
            reverse("file_download"), query_params, **self.headers
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["presigned"], self.presigned_url)

    def test_get_presigned_get_not_authenticated(self):
        query_params = {
            "bucketName": self.bucket_name,
            "minioFileName": self.minio_file_name,
        }

        response = self.client.get(reverse("file_download"), query_params)

        self.assertEqual(response.status_code, 401)

    def test_get_presigned_get_no_bucket_name(self):
        query_params = {"minioFileName": self.minio_file_name}

        response = self.client.get(
            reverse("file_download"), query_params, **self.headers
        )

        self.assertEqual(response.status_code, 400)

    def test_get_presigned_get_no_minio_file_name(self):
        query_params = {"bucketName": self.bucket_name}

        response = self.client.get(
            reverse("file_download"), query_params, **self.headers
        )

        self.assertEqual(response.status_code, 400)

    def test_get_presigned_get_minio_file_name_does_not_exist(self):
        query_params = {"bucketName": self.bucket_name, "minioFileName": "wrong path"}

        response = self.client.get(
            reverse("file_download"), query_params, **self.headers
        )

        self.assertEqual(response.status_code, 404)

from .utils import FileTransferTestEntity
from ..utils import MinioClient
from ..exceptions import MinioObjectNotFound


class TestMinioClient(FileTransferTestEntity):

    def setUp(self):
        super().setUp()
        self.mock_minio_create()
        self.bucket_name = "user"

    def test_is_singleton(self):
        if hasattr(MinioClient, "_instance"):
            delattr(MinioClient, "_instance")

        client1 = MinioClient()
        client2 = MinioClient()

        self.assertTrue(client1 is client2)

    def test_create_user_bucket(self):
        MinioClient().create_user_bucket("user")

        self.mocked_make_bucket.assert_called_once_with("user")

    def test_create_presigned_put(self):
        minio_file_name, _ = MinioClient().create_presigned_put(
            self.bucket_name, self.file_name, self.expiry_time
        )
        self.assertEqual(minio_file_name, self.minio_file_name)
        self.mocked_presigned_put.assert_called_once_with(
            self.bucket_name, self.minio_file_name, expires=self.expiry_time
        )

    def test_create_presigned_get_successfully(self):
        presigned = MinioClient().create_presigned_get(
            self.bucket_name, self.minio_file_name, self.expiry_time
        )
        self.assertEqual(presigned, self.presigned_url)

    def test_create_presigned_get_exception(self):
        with self.assertRaises(MinioObjectNotFound):
            MinioClient().create_presigned_get(
                "wrong bucket", self.minio_file_name, self.expiry_time
            )

    def test_file_exists_at_path_true(self):
        self.assertTrue(
            MinioClient().file_exists_at_path(self.bucket_name, self.minio_file_name)
        )

    def test_file_exists_at_path_false(self):
        self.assertFalse(
            MinioClient().file_exists_at_path("wrong_bucket", self.minio_file_name)
        )

    def tearDown(self):
        super().tearDown()
        self.mock_minio_destroy()

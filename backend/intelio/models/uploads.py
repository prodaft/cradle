from file_transfer.uploads.models import BasePendingUpload


class PendingDigestUpload(BasePendingUpload):
    """Tracks pending digest uploads that have been initiated but not yet finalized.

    The `id` doubles as the future digest ID to keep the S3 object key deterministic:
    object_key == "{user_id}/{id}" (matches digest_upload_path).
    """

    class Meta:
        db_table = "intelio_pendingdigestupload"

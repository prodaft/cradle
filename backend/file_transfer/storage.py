from storages.backends.s3 import S3Storage


class FileTransferStorage(S3Storage):
    """S3 storage for file transfers."""

    bucket_name = "cradle-files"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7  # 7 days


class RelationStorage(S3Storage):
    """S3 storage for relation attachments."""

    bucket_name = "cradle-relations"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7  # 7 days


class ReportStorage(S3Storage):
    """S3 storage for published reports."""

    bucket_name = "cradle-reports"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7


class DigestStorage(S3Storage):
    """S3 storage for digest files."""

    bucket_name = "cradle-digests"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7

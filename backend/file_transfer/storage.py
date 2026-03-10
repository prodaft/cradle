"""S3/MinIO storage backends for CRADLE.

Uses django-storages S3 backend. Each storage class maps to a dedicated bucket.
"""

from storages.backends.s3 import S3Storage


class FileTransferStorage(S3Storage):
    """S3 storage for user-uploaded files (notes, digests, standalone)."""

    bucket_name = "cradle-files"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7  # 7 days


class RelationStorage(S3Storage):
    """S3 storage for knowledge graph relation attachments."""

    bucket_name = "cradle-relations"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7  # 7 days


class ReportStorage(S3Storage):
    """S3 storage for published report exports (HTML, JSON, etc.)."""

    bucket_name = "cradle-reports"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7


class DigestStorage(S3Storage):
    """S3 storage for intel digest uploads (STIX, Falcon, etc.)."""

    bucket_name = "cradle-digests"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60 * 60 * 24 * 7

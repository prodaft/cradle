"""S3/MinIO utilities using django-storages.

Provides bucket management, object CRUD, presigned URLs, and byte fetch/put.
Uses boto3 via storage.connection; supports both S3 and MinIO.
"""

from __future__ import annotations

from functools import cache
from io import BytesIO
from typing import IO, Optional

from django.conf import settings

from .storage import DigestStorage, FileTransferStorage, RelationStorage, ReportStorage

_STORAGES = {cls.bucket_name: cls for cls in (FileTransferStorage, RelationStorage, ReportStorage, DigestStorage)}


def storage_for_bucket(bucket_name: str):
    """Return the django-storages backend for one of our buckets; raise ValueError for any other name."""
    try:
        return _STORAGES[bucket_name]()
    except KeyError:
        raise ValueError(f"Unknown storage bucket {bucket_name!r}.") from None


@cache
def _public_storage(storage_cls):
    return storage_cls(endpoint_url=settings.AWS_S3_PUBLIC_ENDPOINT_URL)


def presign_client(storage):
    """boto3 client for signing URLs that browsers will use.

    Signing needs no connection, so with AWS_S3_PUBLIC_ENDPOINT_URL set the URLs point at
    the public address while server-side calls keep using the internal endpoint.
    """
    if not settings.AWS_S3_PUBLIC_ENDPOINT_URL:
        return storage.connection.meta.client
    return _public_storage(type(storage)).connection.meta.client


def ensure_bucket_exists(bucket_name: str) -> None:
    """Create one of our buckets if it does not exist yet; safe to call repeatedly.

    S3/MinIO do not auto-create buckets on PutObject, so this avoids NoSuchBucket errors.
    """
    from botocore.exceptions import ClientError

    storage = storage_for_bucket(bucket_name)
    client = storage.connection.meta.client
    bucket = storage.bucket_name

    try:
        client.head_bucket(Bucket=bucket)
        return
    except ClientError as e:
        code = (e.response.get("Error") or {}).get("Code") or ""
        if code not in ("404", "NoSuchBucket", "NotFound"):
            raise

    params: dict = {"Bucket": bucket}
    region = getattr(client.meta, "region_name", None)
    if region and region != "us-east-1":
        params["CreateBucketConfiguration"] = {"LocationConstraint": region}

    try:
        client.create_bucket(**params)
    except ClientError as e:
        code = (e.response.get("Error") or {}).get("Code") or ""
        if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            return
        raise


def ensure_cradle_buckets_exist() -> None:
    """Ensure all CRADLE-owned buckets exist (best-effort)."""
    for bucket in _STORAGES:
        ensure_bucket_exists(bucket)


def fetch_bytes(bucket_name: str, key: str) -> Optional[BytesIO]:
    """Fetch an object and return it as an in-memory BytesIO (or None if missing)."""
    storage = storage_for_bucket(bucket_name)
    try:
        with storage.open(key, "rb") as f:
            return BytesIO(f.read())
    except Exception:
        return None


def presign_get(
    bucket_name: str,
    key: str,
    *,
    expires_in: int,
    response_content_type: Optional[str] = None,
    response_content_disposition: Optional[str] = None,
) -> str:
    """Create a presigned GET URL for an object.

    We use boto3 via django-storages' storage.connection.
    """
    storage = storage_for_bucket(bucket_name)
    params: dict = {"Bucket": storage.bucket_name, "Key": key}
    if response_content_type:
        params["ResponseContentType"] = response_content_type
    if response_content_disposition:
        params["ResponseContentDisposition"] = response_content_disposition

    return presign_client(storage).generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def put_bytes(
    bucket_name: str,
    key: str,
    *,
    body: bytes | IO[bytes],
    content_type: str,
) -> None:
    """Write bytes or a readable file object to the given bucket/key."""
    storage = storage_for_bucket(bucket_name)
    storage.connection.meta.client.put_object(
        Bucket=storage.bucket_name,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def delete_object(bucket_name: str, key: str) -> None:
    """Delete an object from the given bucket/key."""
    storage = storage_for_bucket(bucket_name)
    storage.connection.meta.client.delete_object(Bucket=storage.bucket_name, Key=key)


def exists(bucket_name: str, key: str) -> bool:
    """Check if an object exists in the given bucket/key."""
    storage = storage_for_bucket(bucket_name)
    try:
        return storage.exists(key)
    except Exception:
        return False

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from io import BytesIO
from typing import Optional

from .storage import DigestStorage, FileTransferStorage, RelationStorage, ReportStorage


@dataclass(frozen=True)
class S3ObjectRef:
    bucket: str
    key: str


def _get_storage_for_bucket(bucket_name: str):
    """
    Return the django-storages backend for a known bucket.

    Notes:
    - Keep this mapping centralized so other apps can move away from the legacy
      MinIO client while still using boto3 via django-storages.
    """
    if bucket_name == ReportStorage.bucket_name:
        return ReportStorage()
    if bucket_name == DigestStorage.bucket_name:
        return DigestStorage()
    if bucket_name == RelationStorage.bucket_name:
        return RelationStorage()
    # Default: files bucket
    return FileTransferStorage()


def _ensure_bucket_exists(storage) -> None:
    """
    Best-effort ensure bucket exists.

    S3/MinIO do not auto-create buckets on PutObject. This helper avoids
    NoSuchBucket errors for our fixed, app-owned buckets.
    """
    from botocore.exceptions import ClientError

    client = storage.connection.meta.client
    bucket = storage.bucket_name

    try:
        client.head_bucket(Bucket=bucket)
        return
    except ClientError as e:
        code = (e.response.get("Error") or {}).get("Code") or ""
        if code not in ("404", "NoSuchBucket", "NotFound"):
            raise

    # Create the bucket (AWS needs LocationConstraint for non-us-east-1 regions).
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


def ensure_bucket_exists(bucket_name: str) -> None:
    """
    Public wrapper to ensure a bucket exists.

    This is safe to call repeatedly; it is best-effort and will only create the bucket
    if it does not already exist.
    """
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)


def ensure_cradle_buckets_exist() -> None:
    """Ensure all CRADLE-owned buckets exist (best-effort)."""
    for bucket in (
        FileTransferStorage.bucket_name,
        RelationStorage.bucket_name,
        ReportStorage.bucket_name,
        DigestStorage.bucket_name,
    ):
        ensure_bucket_exists(bucket)


def fetch_bytes(bucket_name: str, key: str) -> Optional[BytesIO]:
    """Fetch an object and return it as an in-memory BytesIO (or None if missing)."""
    storage = _get_storage_for_bucket(bucket_name)
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
    """
    Create a presigned GET URL for an object.

    We use boto3 via django-storages' storage.connection.
    """
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)
    params: dict = {"Bucket": storage.bucket_name, "Key": key}
    if response_content_type:
        params["ResponseContentType"] = response_content_type
    if response_content_disposition:
        params["ResponseContentDisposition"] = response_content_disposition

    return storage.connection.meta.client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def put_bytes(
    bucket_name: str,
    key: str,
    *,
    body: bytes,
    content_type: str,
) -> None:
    """Write bytes to the given bucket/key."""
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)
    storage.connection.meta.client.put_object(
        Bucket=storage.bucket_name,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def delete_object(bucket_name: str, key: str) -> None:
    """Delete an object from the given bucket/key."""
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)
    storage.connection.meta.client.delete_object(Bucket=storage.bucket_name, Key=key)


def exists(bucket_name: str, key: str) -> bool:
    """Check if an object exists in the given bucket/key."""
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)
    try:
        return storage.exists(key)
    except Exception:
        return False


def list_keys(bucket_name: str, prefix: str = "") -> set[str]:
    """List object keys in the given bucket, optionally filtered by prefix."""
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)
    client = storage.connection.meta.client
    keys: set[str] = set()

    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=storage.bucket_name, Prefix=prefix):
        for obj in page.get("Contents", []) or []:
            key = obj.get("Key")
            if key:
                keys.add(key)

    return keys


def download_to_path(bucket_name: str, key: str, dst_path: str) -> None:
    """Download an object to a local path (streaming)."""
    storage = _get_storage_for_bucket(bucket_name)
    _ensure_bucket_exists(storage)

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with storage.open(key, "rb") as src, open(dst_path, "wb") as dst:
        shutil.copyfileobj(src, dst)

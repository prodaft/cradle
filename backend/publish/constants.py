"""Publish app constants."""

from datetime import timedelta

# Presigned download URL lifetime (published report files).
PUBLISH_REPORT_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = int(timedelta(hours=8).total_seconds())

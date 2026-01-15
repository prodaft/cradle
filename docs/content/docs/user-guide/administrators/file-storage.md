+++
title = "File Storage Operations"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 6
+++

CRADLE stores attachments in object storage. Uploads are limited only by bucket
size and per-user upload limits.

## Storage backends
- File transfers use S3-compatible storage (for example, MinIO).
- Uploaded files are stored with a UUID-based name for traceability.

## Pending uploads
- The system tracks pending uploads to support presigned URL flows.
- Pending uploads are cleaned up by maintenance tasks.

## File processing
- Files can be auto-processed to compute hashes and metadata.
- Large files may skip hashing based on configured limits.

See also: {{< ref "/docs/developer-guide/backend/file-pipeline" >}}.

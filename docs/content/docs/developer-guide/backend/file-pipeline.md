+++
title = "File Pipeline"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 7
+++

CRADLE handles uploads through a pending-upload flow and stores files in
S3-compatible storage.

## Upload lifecycle
Pending uploads track initiated uploads that are not finalized. Finalized
uploads create `FileReference` records, and files can be linked to notes,
digests, and users.

## Processing
Files can be **auto-processed** to compute hashes and metadata, and hashing is
limited by the configured maximum file size.

## Storage
Storage uses a pluggable backend with bucket configuration, and file paths
include UUIDs for traceability.

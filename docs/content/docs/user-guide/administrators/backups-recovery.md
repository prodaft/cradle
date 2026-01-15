+++
title = "Backups and Recovery"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 8
+++

## Backups
- Schedule database snapshots for PostgreSQL.
- Back up object storage buckets that hold files and report outputs.
- Store backups in a separate, access-controlled location.

## Recovery checklist
- Restore database first, then object storage.
- Verify application migrations are aligned to the restored schema.
- Run a smoke test: login, open a note, and verify a file download.

See also: {{< ref "/docs/developer-guide/backend/deployment" >}}.

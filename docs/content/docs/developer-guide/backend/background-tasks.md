+++
title = "Background Tasks"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 9
+++

CRADLE uses **Celery** for background jobs such as email delivery, note
processing, report generation, and enrichment.

## Worker setup

Start a worker with:

```shell
uv run celery -A cradle worker -Q email,notes,publish,import -l INFO
```

## Common tasks
- **Email notifications** for outbound messaging.
- **Note propagation** and access vector updates.
- **Report compilation** jobs.
- **Enrichment execution** across selected techniques.

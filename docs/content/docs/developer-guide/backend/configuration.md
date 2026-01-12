+++
title = "Configuration"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 10
+++

CRADLE configuration is split across common, dev, test, and docker settings.

## Common settings
- Database connection and credentials.
- Celery broker URL and queues.
- CORS and authentication settings.
- Logging configuration.

## Environment variables
- BASE_URL for API prefixing.
- Database and Redis connection details.
- Storage backend credentials.

See also: {{< ref "/docs/user-guide/administrators/system-settings" >}}.

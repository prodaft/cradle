+++
title = "Upgrades and Maintenance"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 9
+++

## Upgrade flow
- Review release notes and breaking changes.
- Apply database migrations before starting the API.
- Restart workers after API changes.

## Maintenance windows
- Announce planned downtime in advance.
- Pause background tasks during schema changes.
- Verify core workflows after maintenance.

See also: {{< ref "/docs/developer-guide/backend/deployment" >}}.

+++
title = "Monitoring and Logs"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 7
+++

CRADLE maintains logs for system activity. Each log entry captures:

- User: The individual who performed the action.
- Object: The object affected by the action.
- Action: The operation performed (create, edit, delete).

## Log propagation

Logs propagate across affected entities. For example, when a note referencing an
entity is created, an edit log for that entity is generated. This provides a
consistent audit trail across related objects.

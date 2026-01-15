+++
title = "Notifications"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 8
+++

CRADLE uses in-app notifications and email alerts for key events.

## Types of notifications

1. Message notifications
   - General messages with content and timestamp.

2. Access request notifications
   - Triggered when a user requests access to an entity.
   - Sent to users with read-write access.
   - Include requester details and the entity in question.

3. Access granted notifications
   - Sent when a user's access is updated.

4. New user notifications
   - Sent to admins when a new user registers.
   - Include account details and management links.

5. Report status notifications
   - Report ready notifications when rendering completes.
   - Report error notifications when rendering fails.

6. Enrichment notifications
   - Enrichment complete notifications on success.
   - Enrichment error notifications on failure.

## Notification states

- Unread
  New notifications are created as unread.

- Marked unread
  A manual flag for marking important notifications.

## Email integration

Notifications can trigger email delivery for critical events such as access
requests, access grants, new user registration, report status changes, and
enrichment completion or failure.

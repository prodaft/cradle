+++
title = "Architecture Overview"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

CRADLE's backend uses **Django REST Framework** and follows a modular app
structure.

## App structure

### Core applications
- `user` for user management.
- `entries` for entry management.
- `notes` for note-taking.
- `access` for entity-level access control.
- `core` for shared utilities and common services.

### Additional applications
- `notifications` for the notification system.
- `lsp` for editor LSP retrieval.
- `publish` for report creation and importing.
- `logs` for logging functionality.
- `fleeting_notes` for temporary notes.
- `query` for query logic.
- `knowledge_graph` for graph retrieval.
- `management` for settings and admin operations.
- `stats` for usage statistics (package named `stats` so it does not shadow the stdlib `statistics` module; the Django app label stays `statistics`).
- `intelio` for enrichment orchestration.

### External service applications
- `file_transfer` for file uploads and downloads.
- `mail` for mail templates and events.

Core applications are essential to CRADLE. Additional apps depend on core apps
and can be modified with less impact on the system.

## Live note editing

Several users can edit a note at the same time. The editor uses
[CodeMirror collab](https://codemirror.net/examples/collab/) over a WebSocket at
`/api/ws/notes/<note_id>/`, served by Django Channels (`notes/collab/`):

- The server holds each note's live text and update log in Redis (`REDIS_URL`)
  and accepts edits only on top of the latest version; clients rebase and retry.
- Edits are broadcast to everyone in the note and saved to the note shortly after
  typing stops, and when an editor leaves, through the normal note pipeline.
  Validation errors and conflicts with changes made outside the session are
  reported to every editor.
- Joining requires read access to the note; pushing edits requires read-write.
  Open connections re-check this every 30 seconds, so revoking access or
  deleting the note also ends live sessions.
- Editors' cursors and selections are relayed between them (never stored) and
  shown in the editor with each user's name; the bottom bar lists who else is
  editing.

Gunicorn serves WSGI only, so WebSockets need an ASGI server: the backend
container starts Daphne on port 8001 next to Gunicorn, and the reverse proxy must
forward `/api/ws/` there with the WebSocket upgrade headers (see
`docker/nginx.conf`). In development, `runserver` handles both. When the
WebSocket is unavailable, the editor falls back to syncing tabs within one browser
and saving through the REST API.

## Adding a new application

Follow the standard Django tutorial and then apply the testing patterns from
the testing section in this guide.

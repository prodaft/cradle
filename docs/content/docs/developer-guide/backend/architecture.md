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
- `statistics` for usage statistics.
- `intelio` for enrichment orchestration.

### External service applications
- `file_transfer` for file uploads and downloads.
- `mail` for mail templates and events.

Core applications are essential to CRADLE. Additional apps depend on core apps
and can be modified with less impact on the system.

## Adding a new application

Follow the standard Django tutorial and then apply the testing patterns from
the testing section in this guide.

+++
title = "Architecture Overview"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

CRADLE's backend uses Django REST Framework and follows a modular app
structure.

## App structure

### Core applications
- user: user management
- entries: entry management
- notes: note-taking
- access: entity-level access control
- core: shared utilities and common services

### Additional applications
- notifications: notification system
- lsp: editor LSP retrieval
- publish: report creation and importing
- logs: logging functionality
- fleeting_notes: temporary notes
- query: query logic
- knowledge_graph: graph retrieval
- management: settings and admin operations
- cradle_statistics: usage statistics
- intelio: enrichment orchestration

### External service applications
- file_transfer: file uploads and downloads
- mail: mail templates and events

Core applications are essential to CRADLE. Additional apps depend on core apps
and can be modified with less impact on the system.

## Adding a new application

Follow the standard Django tutorial and then apply the testing patterns from
the testing section in this guide.

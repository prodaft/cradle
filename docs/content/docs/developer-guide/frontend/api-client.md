+++
title = "API Client"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

The UI consumes the backend API through generated models and service helpers.

## Generated models
- OpenAPI models are generated into src/renderer/src/services/cradle/models.
- Types are used throughout hooks and components.

## Usage patterns
- Use hooks in src/renderer/src/hooks/api for request handling.
- Prefer typed model responses for UI state.

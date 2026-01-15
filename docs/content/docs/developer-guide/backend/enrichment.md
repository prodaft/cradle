+++
title = "Enrichment System"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 6
+++

CRADLE supports enrichment plugins that expand artifact context and create
relations. Enrichers are configured via EnricherSettings and executed through
EnrichmentRequest.

## Request lifecycle
- A request is created with selected enrichers and target artifacts.
- The request is validated against entry classes.
- Background tasks execute enrichers in parallel.
- Results are written as Entry and Relation records.
- Status and errors are stored per enricher.

## Enricher interface
- Enrichers inherit from BaseEnricher.
- settings_fields defines configuration schema.
- enrich(entries) creates related entries and relations.

## Error handling
- Warnings are stored without failing the whole request.
- Errors mark an enricher or request as failed.

See also: {{< ref "/docs/user-guide/analysts/enrichment" >}}.

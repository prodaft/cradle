+++
title = "Enrichment System"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 6
+++

CRADLE supports enrichment plugins that expand artifact context and create
relations. Enrichers are configured via `EnricherSettings` and executed through
`EnrichmentRequest`.

## Request lifecycle
An enrichment request is created with selected enrichers and target artifacts,
then validated against entry classes. Background tasks execute enrichers in
parallel, results are written as `Entry` and `Relation` records, and status or
errors are stored per enricher.

## Enricher interface
Enrichers inherit from `BaseEnricher`. The `settings_fields` attribute defines
the configuration schema, and `enrich(entries)` creates related entries and
relations.

## Error handling
Warnings are stored without failing the whole request, while errors mark an
enricher or the request as failed.

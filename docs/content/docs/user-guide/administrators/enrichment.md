+++
title = "Enrichment Configuration"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

Enrichers add context to artifacts by querying external sources or running
internal processors. Each enricher exposes settings and produces related
entries and relations.

## Enricher management
- Enable or disable enrichers based on policy or availability.
- Maintain API keys and credentials for external services.
- Review supported entry classes for each enricher.

## Request settings
- Define defaults for timeouts and features exposed by the enricher.
- Limit enrichment to approved artifact types.

## Monitoring
- Track warnings and errors on enrichment requests.
- Review stuck or failed requests and re-run as needed.

See also: {{< ref "/docs/developer-guide/backend/enrichment" >}}.

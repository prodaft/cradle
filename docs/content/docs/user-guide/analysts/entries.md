+++
title = "Working With Entries"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

## Entities vs artifacts
Entries are either entities (high-level objects under investigation) or
artifacts (evidence like IPs, domains, hashes). Entities drive access control
for notes and dashboards.

## Dashboards
Dashboards provide a centralized view for a specific entry. Each dashboard
shows entry details, notes referencing the entry, and related entries derived
from note references:

- Related entities
- Related artifacts
- Second-level entries (two-hop neighbors in the graph)

Dashboards also provide quick access to the graph explorer and report publishing
views.

## Requesting access to an entry
If you see a message indicating inaccessible entities, you can request access
from the dashboard. The request notifies users with read-write access to the
entity. When approved, the entry becomes accessible and you receive a
notification.

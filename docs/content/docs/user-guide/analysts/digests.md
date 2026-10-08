+++
title = "Digests"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 8
+++

Digests bring external data sources into the CRADLE graph. They are used to
ingest structured data and turn it into entries that can be linked, searched,
and analyzed.

## What digests do
Digests are treated similarly to enrichments in the graph. A digest appears
as its own node, and the entries created from the digest connect back to
that node so you can trace where the data came from.

## Common example
Importing a JSON report from another CRADLE instance. When you create the
digest, CRADLE automatically creates the artifacts and related objects in the
backend, and links them into the graph.

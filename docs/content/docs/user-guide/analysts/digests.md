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
that node so you can trace where the data came from. Links between artifacts
from a digest, such as an indicator and the domains it points to, are only
visible to users who can access the entity the digest item belongs to.

## Common example
Importing a JSON report from another CRADLE instance. When you create the
digest, CRADLE automatically creates the artifacts and related objects in the
backend, and links them into the graph. Missing entry types are created only
for managers and administrators, and missing entities only for administrators;
anything skipped is listed in the digest's warnings.

Files attached to the report's notes are downloaded from the links in the
report. Links to this instance's own storage and to public addresses work.
Links to other internal addresses are refused unless an administrator lists
that host in `DIGEST_TRUSTED_FILE_HOSTS`; refused files are counted as failed
in the digest summary. Each file must also fit within your upload limit.

## Viewing a digest
Open **Digest Data** and click a digest to see what it imported. The page
shows its status, type, uploader and summary counts, and the entities it is
linked to. Tabs list:

- **Relations**: the links the digest created between entries. Click a
  relation to see its details, such as the tags carried over from the source.
- **Notes**: the notes the digest imported. Click one to open it.
- **Warnings** and **Errors**: everything skipped or refused while processing.

Relations and notes are only listed when you can access them. While a digest
is still processing, the page refreshes until it finishes.

+++
title = "Entry Taxonomy Management"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

Entry classes define how CRADLE categorizes data. Each entry class includes a
**type**, **subtype**, **format**, and **color**.

The **type** determines whether the entry is an entity or an artifact. Entities
are high-level objects of investigation that control access, while artifacts
are evidence entries linked to notes and entities.

The **subtype** is a unique category such as email, username, ip, domain, or
source. The **format** defines valid input for artifacts using either a regex
pattern or an enumerator list of acceptable values. The **color** is used for
the entry in the knowledge graph.

## Type mappings

Type mappings for external systems (for example, VirusTotal and DNS) are
managed separately from entry classes. Use the admin panel type mappings editor
to configure these integrations.

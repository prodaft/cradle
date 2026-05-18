+++
title = "Enrichment"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 6
+++

Enrichment requests fetch data from external sources and enrich the CRADLE
graph with findings from those sources. CRADLE currently supports the
techniques below.

| Technique | What it adds |
| --- | --- |
| AbuseIPDB | Reputation and abuse context for IP addresses. |
| CIRCL Passive DNS | Historical DNS observations for domains and IPs. |
| DNS | Live or cached DNS resolution context for domains. |
| MISP | Threat intelligence objects and relationships from MISP. |
| MWDB | Malware metadata and related indicators from MWDB. |
| OpenCTI | Entities, relationships, and context from OpenCTI. |
| urlscan.io | Scan results, metadata, and extracted indicators for URLs/domains. |
| VirusTotal | File, URL, domain, and IP reputation context. |

## Create an enrichment request
You can create enrichment requests from the Enrichment page or directly from
notes. When you create a request from notes, CRADLE automatically populates the
artifact list and associated entities.

When creating a request, provide the artifacts to enrich as text input, choose
the enrichment techniques to run, and select the entities the request should be
correlated with for access control and correlation.

  ```
  ip:1.1.1.1
  domain:cradle.sh
  hash:....
  ```

Internally, CRADLE matches each artifact to the selected techniques. If an
artifact does not match any technique, it is ignored and shown as ignored in
the results.

## How enrichment appears in the graph
Each enrichment request appears as its own node in the graph. The nodes
found by the enrichment are linked to the enrichment node, and the enrichment
node is linked to the associated entity nodes.


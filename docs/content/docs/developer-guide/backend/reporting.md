+++
title = "Reports and Publishing"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 8
+++

CRADLE generates reports from selected notes and stores results as
`PublishedReport` records.

## Strategies
Download formats include HTML, plaintext, and JSON, and upload strategies can
publish to external systems.

## Status lifecycle
Report generation moves through `Working`, `Done`, and `Error` states. `Working`
means the job is in progress, `Done` means the report is ready and stored, and
`Error` means the report failed and includes an error message.

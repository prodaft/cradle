+++
title = "Notes and Knowledge Capture"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 2
+++

CRADLE allows users to create and manage notes associated with specific
entities and artifacts. When a note is created, the system automatically links
entities and artifacts mentioned in it. These connections appear in dashboards
and the graph explorer.

Notes are composed using extended markdown with syntax highlighting and live
preview.

## Note syntax

CRADLE extends standard markdown with features for linking entries.

### Basic markdown support
- Headers (#, ##, ###)
- Lists (bulleted and numbered)
- Text formatting (bold, italic, strikethrough)
- Code (inline and blocks)
- Links and images
- Tables
- Blockquotes

### Entity and artifact linking
Use double brackets to link entries by subtype:

- [[subtype:value|alias]] links to an entry.
  Examples: [[case:PTI-42]] or [[ip:1.1.1.1|C2 IP]].

The alias portion is optional and can display a friendlier name. When adding
links in tables, escape the alias separator to avoid conflicts, for example:
[[ip:1.1.1.1\|C2 IP]].

### Best practices
- Use aliases to improve readability.
- Keep notes concise. CRADLE aggregates them under related entries.
- Save work in progress notes as fleeting notes until ready to finalize.

## Adding and referencing files in notes

CRADLE supports multiple file attachments. Upload size is limited by system
settings and may be overridden per user by an administrator. Storage bucket
size also applies.

Files can be uploaded using the file selection button in the editor or by
pasting from the clipboard. Uploaded files appear in a table below the editor
where you can insert references, copy references, or delete files.

If a file is an image, it renders in the note when you prepend its reference
with an exclamation mark, for example: ![image][image.png].

## Role of notes in linking entries

Finalizing a note triggers automatic detection of references (double brackets)
and creates bi-directional links between entries and artifacts. These links are
visible only to users with appropriate access. If a note is deleted, its links
are removed unless supported by other notes.

## Fleeting notes

Fleeting notes are temporary drafts that auto-save as you type. They remain
private, are marked as drafts, and can be edited or deleted before finalization.
Fleeting notes support file attachments and sync across devices. Once you click
Save as Final, the note is added to the knowledge graph and becomes searchable.

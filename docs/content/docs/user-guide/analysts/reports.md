+++
title = "Reports and Exporting"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 7
+++

Reports are exported directly from notes. Select the notes you want to include
and use the `Export` action from the notes list or within the note editor.

When you export, choose an output format. `HTML` produces a web-ready report,
`PDF` produces a printable document with the same layout as the HTML report,
`JSON` supports importing into another CRADLE instance, and `plaintext` is
useful for simple sharing or archiving.

Every HTML and PDF report carries a TLP label: `TLP:CLEAR` (the default),
`TLP:GREEN`, `TLP:AMBER`, `TLP:AMBER+STRICT` or `TLP:RED`. Pick it in the
export dialog; the label is printed on the cover and in the header of every
page. Each note becomes a numbered section. You can also choose whether to
include a table of contents, built from the note titles and their headings, and
an appendix that lists every entry in the report. To give an image a numbered
caption, put it in its own paragraph and write the caption as its alt text:
`![Team structure](image.png)`.

Exporting triggers a background render. You receive both in-app and email
notifications when the report completes successfully or fails with an error.

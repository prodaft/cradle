+++
title = "Reports and Publishing"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 8
+++

CRADLE generates reports from selected notes and stores results as
`PublishedReport` records.

## Strategies
Download formats include HTML, PDF, plaintext, and JSON.

## HTML and PDF reports
HTML and PDF reports share one template, `templates/report/report.html`. The PDF
strategy renders it with WeasyPrint as paginated A4 pages; the HTML strategy
saves it as a single self-contained file that shows the same pages as A4 sheets
in the browser (without page numbers). Each report has a cover page, numbered
sections, and a TLP label (`TLP:CLEAR` by default) on the cover and in the page
header. The table of contents (after the cover) and the entries appendix (at the
end) are optional; the publish request sets them with `include_toc` and
`include_entries`, which are stored in `extra_data`. Each note title becomes a
numbered section and the note's own headings become subsections. Anonymized
reports leave out note titles. Links in the report and note titles show as their
text; in anonymized reports they show the same fake values as the note bodies,
and the download file name says `[redacted]` in their place. An image that sits alone in a paragraph becomes a
numbered figure, captioned with its alt text.

Branding comes from the `REPORT_BRANDING` setting, which the Docker settings read
from environment variables:

| Variable | Purpose |
|---|---|
| `REPORT_BRANDING_ORGANIZATION` | Name shown on the cover and in the footer. Defaults to `CRADLE`, which (with no logo set) shows the Cradle wordmark. |
| `REPORT_BRANDING_TAGLINE` | Line under the organization name on the cover. |
| `REPORT_BRANDING_CONTACT` | Contact line at the bottom of the cover. |
| `REPORT_BRANDING_LOGO` | Path to a logo image for the cover and footer. |
| `REPORT_BRANDING_COVER_IMAGE` | Path to the cover's hero image. Without it the cover uses a gradient in the accent color. |
| `REPORT_BRANDING_WATERMARK` | Path to an image drawn faintly in the middle of every page. |
| `REPORT_BRANDING_DISCLAIMER` | Text printed at the bottom of every page. |
| `REPORT_BRANDING_STYLESHEET` | Path to a CSS file loaded after the default styles. |
| `REPORT_BRANDING_PAGE_MARGIN` | Left and right page margin. Defaults to `25mm`. |
| `REPORT_BRANDING_FONT_SIZE` | Body text size. Defaults to `11pt`. |
| `REPORT_BRANDING_HEADER_FONT_SIZE` | Size of the page header (TLP label and title). Defaults to `11pt`. |
| `REPORT_BRANDING_PAGE_NUMBER_COLOR` | Hex color of the page number in the footer. Defaults to the accent color. |
| `REPORT_BRANDING_TOC_COLOR` | Hex color of the contents page (title, entries and page numbers). Defaults to the accent color. |
| `REPORT_BRANDING_PARAGRAPH_INDENT` | Indent of the first paragraph under each heading. Defaults to `6mm`; `0` turns it off. |
| `REPORT_BRANDING_FONT_DIR` | Directory of font files named `<Family>-<Style>.otf` (or `.ttf`, `.woff`, `.woff2`), for example `Brand-SemiBoldItalic.otf`. The fonts are embedded in both HTML and PDF reports. |
| `REPORT_BRANDING_FONT_FAMILY` | Which family in the font directory to use. Defaults to the first one found. |
| `REPORT_BRANDING_FONT_WEIGHT` | Weight of body text. Defaults to `400`. |
| `REPORT_BRANDING_BOLD_WEIGHT` | Weight of bold text, headings and labels. Defaults to `700`. |

Asset paths must be readable by the backend container. Images and fonts are
embedded in the report, so neither format depends on server paths. The PDF
renderer loads no other local files except those in the stylesheet's directory,
so notes cannot pull in remote URLs or other local files. Lengths must be a
number with a lowercase `mm`, `cm`, `in`, `pt`, `px`, `em` or `rem` unit (or `0`),
weights a multiple of 100 from 100 to 900, and colors a hex value such as
`#3d536e`; other values are ignored with a warning and the default is used.

If your font's regular and bold styles use other weights, set
`REPORT_BRANDING_FONT_WEIGHT` and `REPORT_BRANDING_BOLD_WEIGHT` to match (for
example `300` and `600` for a Light/SemiBold pair). Use the stylesheet to
override the `--report-*` CSS variables, for example `--report-accent` for
heading and table colors. Load fonts through `REPORT_BRANDING_FONT_DIR` rather
than the stylesheet: fonts a stylesheet loads with `url()` work in PDF reports
only, because the HTML report carries the stylesheet inline.

## Status lifecycle
Report generation moves through `Working`, `Done`, and `Error` states. `Working`
means the job is in progress, `Done` means the report is ready and stored, and
`Error` means the report failed and includes an error message.

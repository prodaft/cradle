import base64
import logging
import mimetypes
import re
from html import escape, unescape
from pathlib import Path
from typing import List

import bleach
from django.conf import settings
from django.template.loader import get_template

from entries.models import EntryClass
from file_transfer.s3_utils import fetch_bytes
from file_transfer.storage import FileTransferStorage
from notes.markdown.constants import LINK_REGEX
from notes.markdown.to_html import markdown_to_html
from notes.models import Note

from ..models import PublishedReport
from .base import BasePublishStrategy

logger = logging.getLogger(__name__)

_ENTRY_RE = re.compile(r'<span class="entry" entry-type="([^"]*)">([^<]*)</span>')
_HEADING_RE = re.compile(r"<h([1-6])>(.*?)</h\1>", re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_FIGURE_RE = re.compile(r"<p>\s*(<img [^>]*>)\s*</p>")
_ALT_RE = re.compile(r'alt="([^"]*)"')
_LINK_RE = re.compile(LINK_REGEX)
# Entry type names and colors are written into a <style> block, so only plain values pass.
_CSS_SUBTYPE_RE = re.compile(r"[\w .:/+-]+")
_CSS_COLOR_RE = re.compile(r"#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})")
# Entry colors get an alpha suffix appended, which only yields valid CSS for #rrggbb.
_ENTRY_COLOR_RE = re.compile(r"#[0-9a-fA-F]{6}")

# Headings at or above this level are numbered and listed in the table of contents.
_TOC_DEPTH = 3

# Typography/layout/color settings go into CSS, so each must match its format exactly.
_CSS_LENGTH_RE = re.compile(r"0|\d+(\.\d+)?(mm|cm|in|pt|px|em|rem)")
_CSS_WEIGHT_RE = re.compile(r"[1-9]00")
_FONT_FAMILY_RE = re.compile(r"[\w -]+")
_DEFAULT_FONT_STACK = '"Roboto", "Liberation Sans", "DejaVu Sans", sans-serif'
# Defaults: 25mm side margins, 11pt text and header, indented first paragraphs,
# accent-colored page numbers and contents page. Weights suit the default font.
_STYLE_DEFAULTS = {
    "page_margin": ("25mm", _CSS_LENGTH_RE),
    "font_size": ("11pt", _CSS_LENGTH_RE),
    "header_font_size": ("11pt", _CSS_LENGTH_RE),
    "paragraph_indent": ("6mm", _CSS_LENGTH_RE),
    "font_weight": ("400", _CSS_WEIGHT_RE),
    "bold_weight": ("700", _CSS_WEIGHT_RE),
    "page_number_color": ("var(--report-accent)", _CSS_COLOR_RE),
    "toc_color": ("var(--report-accent)", _CSS_COLOR_RE),
}

# Font files are named <Family>-<Style>.<ext>, e.g. Brand-SemiBoldItalic.otf.
_FONT_FORMATS = {".otf": "opentype", ".ttf": "truetype", ".woff": "woff", ".woff2": "woff2"}
_FONT_STYLE_WEIGHTS = {
    "thin": 100,
    "extralight": 200,
    "ultralight": 200,
    "light": 300,
    "": 400,
    "regular": 400,
    "book": 400,
    "medium": 500,
    "semibold": 600,
    "demibold": 600,
    "bold": 700,
    "extrabold": 800,
    "ultrabold": 800,
    "black": 900,
    "heavy": 900,
}

# Colors from the FIRST TLP 2.0 standard, printed on a black background.
_TLP_COLORS = {
    "clear": "#FFFFFF",
    "green": "#33FF00",
    "amber": "#FFC000",
    "amber+strict": "#FFC000",
    "red": "#FF2B2B",
}


def _link_text(match: re.Match) -> str:
    """How a cradle link reads in plain text: its alias, else its value."""
    return (match["cl_alias"] or match["cl_value"]).strip()


def download_title(title: str, anonymized: bool) -> str:
    """Report title for the download file name.

    Links show as text, or as "[redacted]" in anonymized reports (their fake values exist
    only inside the rendered file). Quotes and line breaks would break the header.
    """
    text = _LINK_RE.sub(lambda match: "[redacted]" if anonymized else _link_text(match), title)
    return " ".join(re.sub(r'["\\]', "", text).split()) or "report"


class HTMLPublish(BasePublishStrategy):
    """Publish notes as a self-contained HTML report.

    The same template also drives the PDF strategy: on screen it shows A4 sheets, in
    print it paginates. Sanitizes user content to prevent XSS.
    """

    content_type = "text/html"
    template_name = "report/report.html"
    for_print = False

    def _sanitize_html(self, html: str) -> str:
        """Sanitize HTML to prevent XSS; allow only safe tags and attributes."""
        allowed_tags = [
            "a",
            "abbr",
            "acronym",
            "b",
            "blockquote",
            "code",
            "em",
            "i",
            "li",
            "ol",
            "strong",
            "ul",
            "p",
            "div",
            "span",
            "br",
            "img",
            "pre",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "hr",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
        ]
        allowed_attrs = {
            "a": ["href", "title"],
            "img": ["src", "alt", "title"],
            "span": ["class", "data-id", "entry-type", "data-key", "data-value"],
        }
        allowed_protocols = {"data", "http", "https"}
        return bleach.clean(
            html,
            tags=allowed_tags,
            attributes=allowed_attrs,
            protocols=allowed_protocols,
            strip=True,
        )

    def _render_notes(self, notes: List[Note]) -> list[str]:
        """Render each note to sanitized HTML, in order."""
        footnotes = {}
        for note in notes:
            for f in note.files.all():
                if not f.file:
                    continue
                footnotes[f.file.name] = (FileTransferStorage.bucket_name, f.file.name)

        rendered = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            rendered_note = markdown_to_html(
                anonymized_note.content,
                fetch_image=lambda bucket, key: fetch_bytes(bucket, key),
                footnotes=footnotes,
            )
            rendered.append(self._sanitize_html(rendered_note))
        return rendered

    def _entry_styles(self) -> str:
        """CSS rules tinting each entry type with its configured color."""
        return "\n".join(
            f'[entry-type="{eclass.subtype}"] {{ background-color: {eclass.color}44; }}'
            for eclass in EntryClass.objects.all()
            if _CSS_SUBTYPE_RE.fullmatch(eclass.subtype) and _ENTRY_COLOR_RE.fullmatch(eclass.color or "")
        )

    def _branding(self) -> dict:
        """Resolve REPORT_BRANDING settings; asset paths that do not exist are dropped with a warning."""
        config = settings.REPORT_BRANDING
        branding: dict = {
            "organization": config.get("organization") or "CRADLE",
            "disclaimer": config.get("disclaimer") or "",
            "tagline": config.get("tagline") or "",
            "contact": config.get("contact") or "",
        }
        for key in ("logo", "cover_image", "watermark", "stylesheet"):
            value = config.get(key) or ""
            path = Path(value).resolve() if value else None
            if path is not None and not path.is_file():
                logger.warning("REPORT_BRANDING[%r] points to a missing file: %s", key, value)
                path = None
            branding[key] = path
        for key, (default, pattern) in _STYLE_DEFAULTS.items():
            value = config.get(key)
            # Only empty values fall back, so a numeric 0 (e.g. no indent) is kept.
            value = default if value is None or value == "" else str(value).strip()
            if not pattern.fullmatch(value):
                logger.warning("REPORT_BRANDING[%r] is not a valid value: %s", key, value)
                value = default
            branding[key] = value
        branding["font_family"], branding["font_faces"] = self._font_faces(
            config.get("font_dir") or "", config.get("font_family") or ""
        )
        return branding

    @staticmethod
    def _font_faces(font_dir: str, family: str) -> tuple[str, str]:
        """Embed the fonts in ``font_dir`` as @font-face rules; returns (family, css).

        Only files of ``family`` (case-insensitive) are used; without one, the first family
        found is. Files that cannot be read or parsed are skipped with a warning.
        """
        if not font_dir:
            return "", ""
        directory = Path(font_dir).resolve()
        if not directory.is_dir():
            logger.warning("REPORT_BRANDING['font_dir'] is not a directory: %s", font_dir)
            return "", ""
        rules = []
        for path in sorted(directory.iterdir()):
            fmt = _FONT_FORMATS.get(path.suffix.lower())
            if fmt is None or not path.is_file():
                continue
            name, _, style = path.stem.rpartition("-")
            name = name or style
            style = "" if name == style else style.lower()
            italic = style.endswith("italic")
            weight = _FONT_STYLE_WEIGHTS.get(style.removesuffix("italic"))
            if weight is None or not _FONT_FAMILY_RE.fullmatch(name):
                logger.warning("Skipping report font with an unrecognised name: %s", path.name)
                continue
            family = family or name
            if name.lower() != family.lower():
                continue
            try:
                data = base64.b64encode(path.read_bytes()).decode()
            except OSError:
                logger.warning("Skipping unreadable report font: %s", path)
                continue
            rules.append(
                f'@font-face {{ font-family: "{family}"; src: url(data:font/{path.suffix[1:].lower()};base64,{data}) '
                f'format("{fmt}"); font-weight: {weight}; font-style: {"italic" if italic else "normal"}; }}'
            )
        if not rules:
            wanted = f" {family}" if family else ""
            logger.warning("REPORT_BRANDING['font_dir'] has no usable%s fonts: %s", wanted, font_dir)
            return "", ""
        return family, "\n".join(rules)

    @staticmethod
    def _data_uri(path: Path | None) -> str:
        """Embed a branding image so the report does not depend on server paths."""
        if path is None:
            return ""
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

    def _build_report_html(self, report: PublishedReport, branding: dict) -> str:
        """Render the report template for a report."""
        notes = list(report.notes.all())
        body, toc = self._number_sections(notes, self._render_notes(notes))
        body = self._caption_figures(body)
        options = report.extra_data or {}
        stylesheet = branding["stylesheet"]

        template = get_template(self.template_name)
        return template.render(
            {
                "title": self._plain_title(report.title),
                "date": report.created_at,
                "organization": branding["organization"],
                "disclaimer": branding["disclaimer"],
                "tagline": branding["tagline"],
                "contact": branding["contact"],
                "logo_uri": self._data_uri(branding["logo"]),
                # Cradle's own wordmark only when no other brand is configured.
                "use_wordmark": not branding["logo"] and branding["organization"] == "CRADLE",
                "cover_uri": self._data_uri(branding["cover_image"]),
                "watermark_uri": self._data_uri(branding["watermark"]),
                # Print links the stylesheet so its relative url()s (fonts) resolve; the
                # standalone HTML file can only carry it inline.
                "stylesheet_uri": stylesheet.as_uri() if stylesheet and self.for_print else "",
                "stylesheet_css": stylesheet.read_text() if stylesheet and not self.for_print else "",
                "tlp_label": report.get_tlp_display(),
                "tlp_color": _TLP_COLORS[report.tlp],
                "toc": toc,
                "include_toc": options.get("include_toc", True),
                "include_entries": options.get("include_entries", True),
                "body": body,
                "entries": self._collect_entries(body),
                "styles": self._entry_styles(),
                "font_stack": (
                    f'"{branding["font_family"]}", {_DEFAULT_FONT_STACK}'
                    if branding["font_family"]
                    else _DEFAULT_FONT_STACK
                ),
                "font_faces": branding["font_faces"],
                **{key: branding[key] for key in _STYLE_DEFAULTS},
            }
        )

    def _number_sections(self, notes: List[Note], rendered: list[str]) -> tuple[str, list[dict]]:
        """Number headings as sections (1, 1.1, ...) and collect the table of contents.

        Each note title becomes a top-level section and the note's highest heading becomes
        a subsection. Notes shown without a title (untitled, or any note in an anonymized
        report) have their highest heading become the section instead.
        """
        counters = [0] * _TOC_DEPTH
        toc: list[dict] = []

        def heading(level: int, inner: str) -> str:
            if level > _TOC_DEPTH:
                return f"<h{level}>{inner}</h{level}>"
            counters[level - 1] += 1
            counters[level:] = [0] * (_TOC_DEPTH - level)
            number = ".".join(str(c) for c in counters[:level])
            anchor = f"sec-{number.replace('.', '-')}"
            toc.append({"id": anchor, "number": number, "level": level, "text": unescape(_TAG_RE.sub("", inner))})
            # A real space (not just CSS margin) keeps "1 Title" apart in PDF bookmarks,
            # copied text and screen readers.
            return f'<h{level} id="{anchor}"><span class="num">{number}</span> {inner}</h{level}>'

        body = ""
        for note, html in zip(notes, rendered):
            titled = not self.anonymize and bool(note.title)
            top = 2 if titled else 1
            levels = [int(m[1]) for m in _HEADING_RE.finditer(html)]
            shift = top - min(levels, default=top)
            section = heading(1, escape(self._plain_title(note.title))) if titled else ""
            section += _HEADING_RE.sub(lambda m: heading(min(int(m[1]) + shift, 6), m[2]), html)
            body += f"<section class='note'>{section}</section>\n"
        return body, toc

    def _plain_title(self, text: str) -> str:
        """Show cradle links in a title as their text, anonymized like the note bodies."""

        def link(match: re.Match) -> str:
            if not self.anonymize:
                return _link_text(match)
            # Aliases are dropped like in anonymized notes, since they can identify the entry.
            eclass = self.eclasses.get(match["cl_type"].strip())
            return self.anonymizer.anonymize(eclass, match["cl_value"].strip()) if eclass else "[redacted]"

        return _LINK_RE.sub(link, text).strip()

    def _caption_figures(self, body: str) -> str:
        """Turn images that stand alone in a paragraph into numbered figures captioned by their alt text."""
        count = 0

        def figure(match: re.Match) -> str:
            nonlocal count
            alt = _ALT_RE.search(match[1])
            if not alt or not alt[1].strip():
                return f"<figure>{match[1]}</figure>"
            count += 1
            caption = f'<span class="label">Figure {count}.</span> {escape(unescape(alt[1]))}'
            return f"<figure>{match[1]}<figcaption>{caption}</figcaption></figure>"

        return _FIGURE_RE.sub(figure, body)

    def _collect_entries(self, body: str) -> list[dict[str, str]]:
        """Unique cradle entries in the report, sorted by type then name."""
        seen: set[tuple[str, str]] = set()
        entries: list[dict[str, str]] = []
        for entry_type, text in _ENTRY_RE.findall(body):
            item = (unescape(entry_type), unescape(text))
            if item in seen:
                continue
            seen.add(item)
            entries.append({"type": item[0], "text": item[1]})
        entries.sort(key=lambda entry: (entry["type"].lower(), entry["text"].lower()))
        return entries

    def create_report(self, report: PublishedReport) -> bool:
        full_html = self._build_report_html(report, self._branding())
        return self._save_report_file(full_html.encode("utf-8"), f"{report.id}.html", report)

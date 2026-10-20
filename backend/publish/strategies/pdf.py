import logging
from pathlib import Path
from urllib.parse import unquote, urlsplit

from weasyprint import HTML
from weasyprint.urls import URLFetcher

from ..models import PublishedReport
from .html import HTMLPublish

logger = logging.getLogger(__name__)


class _LocalAssetFetcher(URLFetcher):
    """Resolve only data: URIs and files inside the branding stylesheet's directory."""

    def __init__(self, roots: list[Path]):
        super().__init__(allowed_protocols={"data", "file"})
        self._roots = roots

    def fetch(self, url, headers=None):
        parts = urlsplit(url)
        if parts.scheme.lower() == "file":
            path = Path(unquote(parts.path)).resolve()
            if not any(path.is_relative_to(root) for root in self._roots):
                raise ValueError(f"File outside report asset directories: {url}")
        return super().fetch(url, headers)


class PDFPublish(HTMLPublish):
    """Publish the report template as a paginated A4 PDF."""

    content_type = "application/pdf"
    for_print = True

    def create_report(self, report: PublishedReport) -> bool:
        """Build a PDF report and upload it to S3."""
        pdf = self._render(report)
        if pdf is None:
            return False
        return self._save_report_file(pdf, f"{report.id}.pdf", report)

    def _render(self, report: PublishedReport) -> bytes | None:
        """Render report notes to PDF bytes. Returns None on failure."""
        try:
            branding = self._branding()
            html = self._build_report_html(report, branding)
            roots = [branding["stylesheet"].parent] if branding["stylesheet"] else []
            pdf = HTML(string=html, url_fetcher=_LocalAssetFetcher(roots)).write_pdf()
            if not pdf:
                raise RuntimeError("PDF renderer returned no bytes.")
        except Exception:
            logger.exception("Failed to render PDF report.")
            report.mark_error("The report could not be rendered. Please try again.")
            return None
        return pdf

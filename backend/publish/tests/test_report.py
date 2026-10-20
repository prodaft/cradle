"""Tests for the shared HTML/PDF report rendering."""

import tempfile
from pathlib import Path
from unittest.mock import patch

from django.db.models.fields.files import FieldFile
from django.test import TestCase, override_settings

from entries.enums import EntryType
from entries.models import EntryClass
from notes.models import Note
from user.models import CradleUser

from ..models import DownloadStrategies, PublishedReport, TrafficLightProtocol
from ..strategies.html import HTMLPublish, download_title
from ..strategies.pdf import PDFPublish, _LocalAssetFetcher


class ReportPublishTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", is_active=True, email_confirmed=True
        )
        self.note = Note.objects.create(author=self.user, content="Hello from the note.", title="Hello")
        self.report = PublishedReport.objects.create(user=self.user, title="Quarterly", strategy=DownloadStrategies.PDF)
        self.report.notes.add(self.note)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_create_report_writes_pdf(self):
        captured = {}

        def fake_save(field_file, name, content, save=True):
            captured["name"] = name
            captured["data"] = content.read()

        with patch.object(FieldFile, "save", fake_save):
            ok = PDFPublish(anonymize=False).create_report(self.report)

        self.assertTrue(ok)
        self.assertEqual(captured["name"], f"{self.report.id}.pdf")
        self.assertTrue(captured["data"].startswith(b"%PDF"))

    def test_report_has_cover_contents_and_tlp(self):
        self.note.content = "# Background\n\nSome text.\n\n## Details\n\nMore text.\n\n#### Minor\n"
        self.note.save()
        self.report.tlp = TrafficLightProtocol.AMBER
        self.report.save()

        publisher = PDFPublish(anonymize=False)
        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn('class="cover"', html)
        self.assertIn("TLP:AMBER", html)
        self.assertIn('<h1 id="sec-1"><span class="num">1</span> Hello</h1>', html)
        self.assertIn('<h2 id="sec-1-1"><span class="num">1.1</span> Background</h2>', html)
        self.assertIn('<h3 id="sec-1-1-1"><span class="num">1.1.1</span> Details</h3>', html)
        self.assertIn("<h5>Minor</h5>", html)
        self.assertIn('href="#sec-1-1-1"', html)

    def test_tlp_colors_follow_first_standard(self):
        expected = {
            TrafficLightProtocol.RED: "#FF2B2B",
            TrafficLightProtocol.AMBER: "#FFC000",
            TrafficLightProtocol.AMBER_STRICT: "#FFC000",
            TrafficLightProtocol.GREEN: "#33FF00",
            TrafficLightProtocol.CLEAR: "#FFFFFF",
        }
        publisher = PDFPublish(anonymize=False)

        for tlp, color in expected.items():
            self.report.tlp = tlp
            html = publisher._build_report_html(self.report, publisher._branding())
            self.assertIn(f'class="tlp" style="color: {color};">{self.report.get_tlp_display()}<', html)
            self.assertIn("background: #000000;", html)

    def test_title_is_escaped_once(self):
        self.report.title = "Smoke & Mirrors <b>"
        publisher = PDFPublish(anonymize=False)

        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn("<title>Smoke &amp; Mirrors &lt;b&gt;</title>", html)
        self.assertNotIn("&amp;amp;", html)

    def test_titles_show_links_as_text(self):
        self.report.title = "Overview [[case:PTI-1]] via [[ip:10.0.0.1|the gateway]]"
        self.note.title = "Notes on [[case:PTI-1]]"
        self.note.save()
        publisher = PDFPublish(anonymize=False)

        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn("<title>Overview PTI-1 via the gateway</title>", html)
        self.assertIn('<span class="num">1</span> Notes on PTI-1</h1>', html)
        self.assertNotIn("[[", html)

    def test_anonymized_titles_hide_linked_values(self):
        EntryClass.objects.create(type=EntryType.ENTITY, subtype="case", prefix="PTI-")
        self.report.title = "Overview [[case:PTI-1]] [[unknown:secret]]"
        self.note.content = "Body [[case:PTI-1]]"
        self.note.save()
        publisher = PDFPublish(anonymize=True)

        with patch("notes.markdown.to_markdown.random.randint", return_value=417):
            html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn("<title>Overview PTI-417 [redacted]</title>", html)
        self.assertIn('entry-type="case">PTI-417</span>', html)
        self.assertNotIn("PTI-1<", html)
        self.assertNotIn("secret", html)

    def test_download_title_never_shows_link_syntax(self):
        title = 'Overview [[case:PTI-1]] "x"\r\n[[ip:10.0.0.1|gw]]'

        self.assertEqual(download_title(title, anonymized=False), "Overview PTI-1 x gw")
        self.assertEqual(download_title(title, anonymized=True), "Overview [redacted] x [redacted]")
        self.assertEqual(download_title('""', anonymized=False), "report")

    def test_untitled_note_headings_start_a_section(self):
        self.note.title = ""
        self.note.content = "## Overview\n\nText."
        self.note.save()
        publisher = PDFPublish(anonymize=False)

        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn('<h1 id="sec-1"><span class="num">1</span> Overview</h1>', html)

    def test_anonymized_report_omits_note_titles(self):
        self.note.title = "Secret operation name"
        self.note.content = "## Overview\n\nText."
        self.note.save()

        publisher = PDFPublish(anonymize=True)
        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertNotIn("Secret operation name", html)
        self.assertIn('<h1 id="sec-1"><span class="num">1</span> Overview</h1>', html)

    def test_tlp_defaults_to_clear(self):
        publisher = PDFPublish(anonymize=False)
        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertEqual(self.report.tlp, TrafficLightProtocol.CLEAR)
        self.assertEqual(html.count('class="tlp" style="color: #FFFFFF;">TLP:CLEAR<'), 2)

    def test_toc_and_entries_are_optional(self):
        self.note.content = "## Overview\n\n[[ip:10.0.0.1]]"
        self.note.save()
        publisher = PDFPublish(anonymize=False)

        html = publisher._build_report_html(self.report, publisher._branding())
        self.assertIn('class="toc"', html)
        self.assertIn('id="appendix-entries"', html)

        self.report.extra_data = {"include_toc": False, "include_entries": False}
        html = publisher._build_report_html(self.report, publisher._branding())
        self.assertNotIn('class="toc"', html)
        self.assertNotIn('id="appendix-entries"', html)

    def test_standalone_images_become_captioned_figures(self):
        body = '<p><img src="data:image/png;base64,AA" alt="Team structure"></p><p><img src="x" alt=""></p>'

        html = PDFPublish(anonymize=False)._caption_figures(body)

        self.assertIn('<figcaption><span class="label">Figure 1.</span> Team structure</figcaption>', html)
        self.assertEqual(html.count("<figcaption>"), 1)
        self.assertEqual(html.count("<figure>"), 2)

    def test_figure_captions_are_escaped_once(self):
        body = '<p><img src="x" alt="A &amp; B"></p><p><img src="y" alt="a<b"></p>'

        html = PDFPublish(anonymize=False)._caption_figures(body)

        self.assertIn("Figure 1.</span> A &amp; B</figcaption>", html)
        self.assertIn("Figure 2.</span> a&lt;b</figcaption>", html)

    def test_cradle_wordmark_only_for_default_branding(self):
        publisher = PDFPublish(anonymize=False)
        html = publisher._build_report_html(self.report, publisher._branding())
        self.assertEqual(html.count('viewBox="0 0 2627 679"'), 2)

        with override_settings(REPORT_BRANDING={"organization": "ACME"}):
            html = publisher._build_report_html(self.report, publisher._branding())
        self.assertNotIn('viewBox="0 0 2627 679"', html)
        self.assertIn('<span class="org">ACME</span>', html)

    def test_branding_assets_are_embedded(self):
        with tempfile.TemporaryDirectory() as tmp:
            logo = Path(tmp) / "logo.svg"
            logo.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')
            css = Path(tmp) / "brand.css"
            css.write_text(":root { --report-accent: #7a1f1f; }")
            branding = {
                "organization": "ACME",
                "logo": str(logo),
                "stylesheet": str(css),
                "disclaimer": "Do not share.",
                "cover_image": "/nope.png",
            }
            with override_settings(REPORT_BRANDING=branding):
                pdf_publisher = PDFPublish(anonymize=False)
                resolved = pdf_publisher._branding()
                pdf_html = pdf_publisher._build_report_html(self.report, resolved)
                html = HTMLPublish(anonymize=False)._build_report_html(self.report, resolved)
                pdf = pdf_publisher._render(self.report)

        self.assertIsNone(resolved["cover_image"])
        self.assertIn('src="data:image/svg+xml;base64,', html)
        self.assertNotIn("file:", html)
        self.assertIn("<style>:root { --report-accent: #7a1f1f; }</style>", html)
        self.assertIn(f'<link rel="stylesheet" href="{css.resolve().as_uri()}" />', pdf_html)
        self.assertIn("Do not share.", html)
        self.assertTrue(pdf.startswith(b"%PDF"))

    def test_typography_defaults(self):
        publisher = PDFPublish(anonymize=False)
        html = publisher._build_report_html(self.report, publisher._branding())

        self.assertIn("margin: 25mm 25mm 26mm 25mm;", html)
        self.assertIn("--report-font-size: 11pt;", html)
        self.assertIn("--report-indent: 6mm;", html)
        self.assertIn("--report-weight: 400;", html)
        self.assertIn("--report-weight-bold: 700;", html)
        self.assertIn("--report-header-size: 11pt;", html)
        self.assertIn("--report-page-number: var(--report-accent);", html)
        self.assertIn("--report-toc: var(--report-accent);", html)

    def test_typography_settings_are_validated(self):
        branding = {
            "page_margin": "20mm",
            "font_size": "12pt;}</style>",
            "bold_weight": 600,
            "font_weight": "350",
            "paragraph_indent": 0,
            "page_number_color": "#7a1f1f",
            "toc_color": "red;}</style>",
        }
        with override_settings(REPORT_BRANDING=branding):
            resolved = HTMLPublish(anonymize=False)._branding()

        self.assertEqual(resolved["page_margin"], "20mm")
        self.assertEqual(resolved["font_size"], "11pt")
        self.assertEqual(resolved["bold_weight"], "600")
        self.assertEqual(resolved["font_weight"], "400")
        self.assertEqual(resolved["paragraph_indent"], "0")
        self.assertEqual(resolved["page_number_color"], "#7a1f1f")
        self.assertEqual(resolved["toc_color"], "var(--report-accent)")

    def test_font_dir_is_embedded_by_family_and_style(self):
        with tempfile.TemporaryDirectory() as tmp:
            for name in ("Brand-Light.otf", "BRAND-SemiBoldItalic.otf", "Brand.ttf", "Other-Bold.otf", "notes.txt"):
                (Path(tmp) / name).write_bytes(b"font")
            (Path(tmp) / "Brand-Wobbly.otf").write_bytes(b"font")
            (Path(tmp) / "Brand-Bold.otf").mkdir()
            unreadable = Path(tmp) / "Brand-Black.otf"
            unreadable.write_bytes(b"font")
            unreadable.chmod(0)
            with override_settings(REPORT_BRANDING={"font_dir": tmp, "font_family": "brand"}):
                publisher = HTMLPublish(anonymize=False)
                branding = publisher._branding()
                html = publisher._build_report_html(self.report, branding)

        css = branding["font_faces"]
        self.assertEqual(branding["font_family"], "brand")
        self.assertEqual(css.count('@font-face { font-family: "brand";'), 3)
        self.assertIn('format("opentype"); font-weight: 300; font-style: normal;', css)
        self.assertIn('format("opentype"); font-weight: 600; font-style: italic;', css)
        self.assertIn('url(data:font/ttf;base64,Zm9udA==) format("truetype"); font-weight: 400;', css)
        self.assertNotIn("Other", css)
        self.assertIn('--report-font: "brand", "Roboto"', html)

    def test_fetcher_rejects_files_outside_asset_roots(self):
        with tempfile.TemporaryDirectory() as tmp:
            fetcher = _LocalAssetFetcher([Path(tmp).resolve()])
            with self.assertRaises(ValueError):
                fetcher.fetch("file:///etc/passwd")
            with self.assertRaises(ValueError):
                fetcher.fetch("FILE:///etc/passwd")
            with self.assertRaises(ValueError):
                fetcher.fetch("http://127.0.0.1:9/x.png")
            inside = Path(tmp) / "a.css"
            inside.write_text("p {}")
            self.assertEqual(fetcher.fetch(inside.resolve().as_uri()).read(), b"p {}")

    def test_html_report_uses_the_report_template(self):
        self.note.content = "# Heading\n\n| a | b |\n|---|---|\n| 1 | 2 |\n"
        self.note.save()
        captured = {}

        def fake_save(field_file, name, content, save=True):
            captured["name"] = name
            captured["data"] = content.read().decode()

        with patch.object(FieldFile, "save", fake_save):
            ok = HTMLPublish(anonymize=False).create_report(self.report)

        self.assertTrue(ok)
        self.assertEqual(captured["name"], f"{self.report.id}.html")
        html = captured["data"]
        self.assertIn('class="cover"', html)
        self.assertIn('<h2 id="sec-1-1"><span class="num">1.1</span> Heading</h2>', html)
        self.assertIn("<td>1</td>", html)
        self.assertIn("@media screen", html)

    def test_entry_styles_skip_unsafe_types_and_colors(self):
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip", color="#3d536e")
        EntryClass.objects.create(
            type=EntryType.ARTIFACT, subtype="</style><img src=x onerror=alert(1)>", color="#ff0000"
        )
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="domain", color="r;}x{a")
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="url", color="#abcde")

        styles = HTMLPublish(anonymize=False)._entry_styles()

        self.assertIn('[entry-type="ip"] { background-color: #3d536e44; }', styles)
        self.assertNotIn("</style>", styles)
        self.assertNotIn("domain", styles)
        self.assertNotIn("url", styles)

    def test_collect_entries_is_unique_and_sorted(self):
        body = (
            '<span class="entry" entry-type="ip">10.0.0.2</span>'
            '<span class="entry" entry-type="ip">10.0.0.2</span>'
            '<span class="entry" entry-type="domain">a.example</span>'
        )

        entries = PDFPublish(anonymize=False)._collect_entries(body)

        self.assertEqual(
            entries,
            [
                {"type": "domain", "text": "a.example"},
                {"type": "ip", "text": "10.0.0.2"},
            ],
        )

    def test_render_does_not_fetch_remote_urls(self):
        self.note.content = "![probe](http://127.0.0.1:9/internal.png)"
        self.note.save()

        with patch("urllib.request.OpenerDirector.open") as remote_open:
            pdf = PDFPublish(anonymize=False)._render(self.report)

        self.assertTrue(pdf.startswith(b"%PDF"))
        remote_open.assert_not_called()

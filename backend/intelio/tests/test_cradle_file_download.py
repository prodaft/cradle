"""Tests for downloading files linked from CRADLE reports (SSRF guard)."""

import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from urllib.parse import urlparse

from django.test import SimpleTestCase, TestCase, override_settings

from intelio.models.digest.cradle import CradleDigest
from intelio.tasks.cradle import _is_own_storage_url, _is_trusted_host, download_file_for_note
from notes.models import Note
from user.models import CradleUser

BUCKET = "cradle-files"
SIGNED = "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc"


@override_settings(AWS_S3_ENDPOINT_URL="http://minio:9000", AWS_S3_PUBLIC_ENDPOINT_URL="https://cradle.example")
class OwnStorageUrlTest(SimpleTestCase):
    def own(self, url):
        return _is_own_storage_url(urlparse(url), BUCKET)

    def test_presigned_urls_from_our_storage(self):
        self.assertTrue(self.own(f"http://minio:9000/cradle-files/abc-report.pdf{SIGNED}"))
        self.assertTrue(self.own(f"https://cradle.example/cradle-files/abc-report.pdf{SIGNED}"))
        self.assertTrue(self.own(f"https://CRADLE.example:443/cradle-files/a%20b.pdf{SIGNED}"))

    def test_rejects_other_origins(self):
        self.assertFalse(self.own(f"http://minio:9001/cradle-files/x{SIGNED}"))
        self.assertFalse(self.own(f"http://cradle.example/cradle-files/x{SIGNED}"))
        self.assertFalse(self.own(f"http://rabbitmq:15672/cradle-files/x{SIGNED}"))

    def test_rejects_unsigned_or_other_buckets(self):
        self.assertFalse(self.own("https://cradle.example/cradle-files/x"))
        self.assertFalse(self.own(f"https://cradle.example/cradle-digests/x{SIGNED}"))

    def test_rejects_paths_escaping_the_bucket(self):
        for path in (
            "/cradle-files/../api/users/",
            "/cradle-files/%2e%2e/api/",
            "/cradle-files/..%5capi",
            "/cradle-files//x",
        ):
            with self.subTest(path=path):
                self.assertFalse(self.own(f"https://cradle.example{path}{SIGNED}"))


class TrustedHostTest(SimpleTestCase):
    @override_settings(DIGEST_TRUSTED_FILE_HOSTS=["Peer.internal"])
    def test_configured_hosts(self):
        self.assertTrue(_is_trusted_host(urlparse("https://peer.internal/x")))
        self.assertFalse(_is_trusted_host(urlparse("https://other.internal/x")))


class _FileHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"report-bytes"
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class DownloadFileForNoteTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), _FileHandler)
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        super().tearDownClass()

    def setUp(self):
        patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        patcher.start()
        self.addCleanup(patcher.stop)
        self.user = CradleUser.objects.create_user(username="user", password="user", email="user@example.com")
        self.note = Note.objects.create(author=self.user, fleeting=False, content="note", title="Note")
        self.digest = CradleDigest.objects.create(
            user=self.user,
            title="report",
            digest_type="CradleDigest",
            summary={"files_scheduled": 1, "files_downloaded": 0, "files_failed": 0},
        )
        self.stored = {}

        def put_bytes(bucket_name, key, *, body, content_type):
            self.stored[key] = (body.read(), content_type)

        for target, kwargs in (
            ("intelio.tasks.cradle.put_bytes", {"side_effect": put_bytes}),
            ("file_transfer.models.FileReference.process_file", {}),
            ("intelio.models.base.BaseDigest.finalize", {}),
        ):
            p = patch(target, **kwargs)
            p.start()
            self.addCleanup(p.stop)

    def download(self, url, file_identifier="abc-report.pdf"):
        download_file_for_note(self.note.id, file_identifier, url, BUCKET, self.digest.id)
        self.digest.refresh_from_db()
        return self.digest.summary

    def test_internal_url_is_refused(self):
        summary = self.download(f"{self.origin}/latest/meta-data/")

        self.assertEqual((summary["files_downloaded"], summary["files_failed"]), (0, 1))
        self.assertEqual(self.stored, {})
        self.assertFalse(self.note.files.exists())

    def test_own_storage_presigned_url_is_imported(self):
        with override_settings(AWS_S3_PUBLIC_ENDPOINT_URL=self.origin):
            summary = self.download(f"{self.origin}/cradle-files/abc-report.pdf{SIGNED}", "../abc-report.pdf")

        self.assertEqual((summary["files_downloaded"], summary["files_failed"]), (1, 0))
        file_ref = self.note.files.get()
        self.assertEqual(file_ref.file_name, "abc-report.pdf")
        self.assertEqual(self.stored, {f"{file_ref.id}-abc-report.pdf": (b"report-bytes", "application/pdf")})

    def test_download_over_user_limit_is_refused(self):
        self.user.file_upload_limit_override = 4
        self.user.save(update_fields=["file_upload_limit_override"])

        with override_settings(DIGEST_TRUSTED_FILE_HOSTS=["127.0.0.1"]):
            summary = self.download(f"{self.origin}/file")

        self.assertEqual((summary["files_downloaded"], summary["files_failed"]), (0, 1))
        self.assertEqual(self.stored, {})

"""Tests for the SSRF-guarded URL fetcher."""

import io
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from django.test import SimpleTestCase

from core.safe_fetch import UnsafeFetchError, fetch_url, is_public_address


def fetch(url, **kwargs):
    """Fetch ``url`` into memory, returning ``(body, content_type)``."""
    body = io.BytesIO()
    content_type = fetch_url(url, body, **kwargs)
    return body.getvalue(), content_type


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/slow":
            self.send_response(200)
            self.send_header("Content-Length", "100")
            self.end_headers()
            for _ in range(100):
                self.wfile.write(b"x")
                self.wfile.flush()
                time.sleep(0.05)
            return
        if self.path.startswith("/redirect"):
            self.send_response(302)
            self.send_header("Location", self.server.redirect_to)
            self.end_headers()
            return
        body = b"x" * (2048 if self.path == "/big-undeclared" else 16)
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        if self.path == "/big":
            # Declared size only: an over-limit Content-Length must be refused before reading.
            self.send_header("Content-Length", "2048")
        elif self.path != "/big-undeclared":
            self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class IsPublicAddressTest(SimpleTestCase):
    def test_public(self):
        self.assertTrue(is_public_address("1.1.1.1"))
        self.assertTrue(is_public_address("2606:4700:4700::1111"))
        self.assertTrue(is_public_address("64:ff9b::101:101"))

    def test_non_public(self):
        for address in (
            "127.0.0.1",
            "10.0.0.5",
            "172.18.0.2",
            "192.168.1.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "224.0.0.1",
            "::1",
            "fe80::1%eth0",
            "fd00::1",
            "::ffff:127.0.0.1",
            "::ffff:169.254.169.254",
            "64:ff9b::a9fe:a9fe",
            "::127.0.0.1",
            "2002:7f00:1::",
        ):
            with self.subTest(address=address):
                self.assertFalse(is_public_address(address))


class FetchUrlTest(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        cls.server.redirect_to = ""
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        super().tearDownClass()

    def test_rejects_non_http_schemes(self):
        for url in ("file:///etc/passwd", "gopher://127.0.0.1/", "ftp://example.com/x", "//example.com/x"):
            with self.subTest(url=url), self.assertRaises(UnsafeFetchError):
                fetch(url, max_bytes=1024)

    def test_rejects_embedded_credentials(self):
        with self.assertRaises(UnsafeFetchError):
            fetch("http://guest:guest@rabbitmq:15672/api/overview", max_bytes=1024)

    def test_rejects_loopback(self):
        with self.assertRaisesRegex(UnsafeFetchError, "non-public"):
            fetch(f"{self.base}/file", max_bytes=1024)

    def test_rejects_loopback_over_https(self):
        with self.assertRaisesRegex(UnsafeFetchError, "non-public"):
            fetch(f"https://127.0.0.1:{self.server.server_port}/file", max_bytes=1024)

    def test_rejects_hostname_resolving_to_loopback(self):
        with self.assertRaisesRegex(UnsafeFetchError, "non-public"):
            fetch(f"http://localhost:{self.server.server_port}/file", max_bytes=1024)

    def test_trusted_url_may_reach_private_address(self):
        content, content_type = fetch(f"{self.base}/file", max_bytes=1024, is_trusted=lambda parsed: True)
        self.assertEqual(content, b"x" * 16)
        self.assertEqual(content_type, "text/plain")

    def test_redirect_out_of_trusted_host_is_rechecked(self):
        self.server.redirect_to = f"http://localhost:{self.server.server_port}/file"
        with self.assertRaisesRegex(UnsafeFetchError, "non-public"):
            fetch(
                f"{self.base}/redirect",
                max_bytes=1024,
                is_trusted=lambda parsed: parsed.hostname == "127.0.0.1",
            )

    def test_redirect_to_disallowed_scheme(self):
        self.server.redirect_to = "file:///etc/passwd"
        with self.assertRaises(UnsafeFetchError):
            fetch(f"{self.base}/redirect", max_bytes=1024, is_trusted=lambda parsed: True)

    def test_redirect_loop_is_capped(self):
        self.server.redirect_to = "/redirect"
        with self.assertRaisesRegex(UnsafeFetchError, "redirects"):
            fetch(f"{self.base}/redirect", max_bytes=1024, is_trusted=lambda parsed: True)

    def test_declared_size_over_limit(self):
        with self.assertRaisesRegex(UnsafeFetchError, "larger"):
            fetch(f"{self.base}/big", max_bytes=1024, is_trusted=lambda parsed: True)

    def test_streamed_size_over_limit(self):
        with self.assertRaisesRegex(UnsafeFetchError, "larger"):
            fetch(f"{self.base}/big-undeclared", max_bytes=1024, is_trusted=lambda parsed: True)

    def test_slow_response_hits_deadline(self):
        started = time.monotonic()
        with self.assertRaisesRegex(UnsafeFetchError, "too long"):
            fetch(f"{self.base}/slow", max_bytes=1024, deadline=0.5, is_trusted=lambda parsed: True)
        self.assertLess(time.monotonic() - started, 2)

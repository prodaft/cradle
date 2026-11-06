"""Fetch user-supplied URLs without letting them reach internal hosts (SSRF guard).

The address check runs on the connected socket's peer, so a hostname that resolves
(or re-resolves) to a private address is refused no matter how DNS answers.
"""

from __future__ import annotations

import ipaddress
import socket
import time
from typing import IO, Callable
from urllib.parse import ParseResult, urljoin, urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool

ALLOWED_SCHEMES = frozenset({"http", "https"})
REDIRECT_STATUSES = frozenset({301, 302, 303, 307, 308})
# IPv6 ranges that carry an IPv4 address in their last 32 bits (NAT64, IPv4-compatible).
_EMBEDDED_IPV4_NETWORKS = (ipaddress.IPv6Network("64:ff9b::/96"), ipaddress.IPv6Network("::/96"))
CHUNK_SIZE = 64 * 1024


class UnsafeFetchError(ValueError):
    """The URL, a redirect target or the response was refused."""


def is_public_address(address: str) -> bool:
    """Whether ``address`` is a globally routable unicast IP."""
    ip = ipaddress.ip_address(address.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        elif any(ip in network for network in _EMBEDDED_IPV4_NETWORKS):
            ip = ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
    return ip.is_global and not ip.is_multicast


class _PublicPeerMixin:
    def _new_conn(self) -> socket.socket:
        sock = super()._new_conn()  # type: ignore[misc]
        peer = sock.getpeername()[0]
        if not is_public_address(peer):
            sock.close()
            raise UnsafeFetchError(f"Refusing to connect to non-public address {peer}.")
        return sock


class _PublicHTTPConnection(_PublicPeerMixin, HTTPConnection):
    pass


class _PublicHTTPSConnection(_PublicPeerMixin, HTTPSConnection):
    pass


class _PublicHTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = _PublicHTTPConnection


class _PublicHTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = _PublicHTTPSConnection


class _PublicOnlyAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        super().init_poolmanager(*args, **kwargs)
        self.poolmanager.pool_classes_by_scheme = {
            "http": _PublicHTTPConnectionPool,
            "https": _PublicHTTPSConnectionPool,
        }


def _session(public_only: bool) -> requests.Session:
    session = requests.Session()
    # Environment proxies would make the peer the proxy, hiding the real target.
    session.trust_env = False
    if public_only:
        adapter = _PublicOnlyAdapter()
        session.mount("http://", adapter)
        session.mount("https://", adapter)
    return session


def _check_url(url: str) -> ParseResult:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.hostname:
        raise UnsafeFetchError("Only http and https URLs can be fetched.")
    if parsed.username or parsed.password:
        raise UnsafeFetchError("URLs with embedded credentials are not allowed.")
    return parsed


def fetch_url(
    url: str,
    dest: IO[bytes],
    *,
    max_bytes: int,
    timeout: float = 10,
    deadline: float = 300,
    max_redirects: int = 3,
    is_trusted: Callable[[ParseResult], bool] = lambda parsed: False,
) -> str:
    """GET ``url`` into ``dest`` and return its Content-Type, refusing non-public hosts.

    ``dest`` may hold a partial body if this raises.

    Args:
        dest: Writable file object the body is streamed into.
        max_bytes: Largest body accepted; bigger responses are aborted mid-stream.
        timeout: Connect/read timeout per socket operation.
        deadline: Wall-clock limit for the whole fetch, redirects included.
        max_redirects: Redirect hops followed, each one re-checked.
        is_trusted: URLs it accepts may resolve to non-public addresses (e.g. our own storage).

    Raises:
        UnsafeFetchError: URL, redirect or response refused.
        requests.RequestException, urllib3.exceptions.HTTPError: Network or HTTP error.
    """
    expires_at = time.monotonic() + deadline

    for _ in range(max_redirects + 1):
        parsed = _check_url(url)
        with _session(public_only=not is_trusted(parsed)) as session:
            response = session.get(url, timeout=timeout, stream=True, allow_redirects=False)
            with response:
                if response.status_code in REDIRECT_STATUSES:
                    location = response.headers.get("Location")
                    if not location:
                        raise UnsafeFetchError("Redirect without a Location header.")
                    url = urljoin(url, location)
                    continue

                response.raise_for_status()
                declared = response.headers.get("Content-Length")
                if declared and declared.isdigit() and int(declared) > max_bytes:
                    raise UnsafeFetchError("The response is larger than allowed.")

                received = 0
                # read1 returns after each socket read, so a server trickling bytes
                # cannot hold one read open past the deadline.
                while chunk := response.raw.read1(CHUNK_SIZE, decode_content=True):
                    received += len(chunk)
                    if received > max_bytes:
                        raise UnsafeFetchError("The response is larger than allowed.")
                    if time.monotonic() > expires_at:
                        raise UnsafeFetchError("The download took too long.")
                    dest.write(chunk)

                return response.headers.get("Content-Type", "application/octet-stream")

    raise UnsafeFetchError("Too many redirects.")

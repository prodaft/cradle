from django.db import models

from ..base import BaseEnricher


class DNSEnricher(BaseEnricher):
    """Enriches domains with active DNS resolution (A and AAAA records).

    Supported entry classes: domain.
    Execution runs inside an isolated container (enrichers/dns/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "DNS"

    settings_fields = {
        "dns_server": models.CharField(
            default="1.1.1.1",
            help_text="DNS server to use for resolution (default: Cloudflare 1.1.1.1)",
        ),
        "resolve_ipv4": models.BooleanField(default=True, help_text="Resolve A records (IPv4 addresses)"),
        "resolve_ipv6": models.BooleanField(default=True, help_text="Resolve AAAA records (IPv6 addresses)"),
    }

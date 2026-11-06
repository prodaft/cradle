"""DNS enricher container.

Resolves A and AAAA records for domain entries using the configured DNS server.
No database access - DNS type mappings are passed in the job payload.

Network requirement: external (needs outbound UDP/TCP 53).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dns.resolver
from _base.enricher_base import main, make_relation


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    dns_typemapping: dict[str, str] = job.get("dns_typemapping") or {}

    dns_server = settings.get("dns_server", "1.1.1.1")
    resolve_ipv4 = settings.get("resolve_ipv4", True)
    resolve_ipv6 = settings.get("resolve_ipv6", True)

    resolver = dns.resolver.Resolver()
    resolver.nameservers = [dns_server]

    relations = []
    warnings = []
    unmapped_types: set[str] = set()

    ipv4_class = dns_typemapping.get("A")
    ipv6_class = dns_typemapping.get("AAAA")

    if not dns_typemapping:
        warnings.append(
            "No DNS type mappings are configured. "
            "IP address extraction will be disabled until an administrator adds them in the admin site."
        )

    for entry in entries:
        hostname = entry["name"]

        if resolve_ipv4:
            if ipv4_class:
                try:
                    answers = resolver.resolve(hostname, "A")
                    for answer in answers:
                        ip = answer.to_text()
                        relations.append(
                            make_relation(
                                e1_name=hostname,
                                e1_class=entry["entry_class"],
                                e2_name=ip,
                                e2_class=ipv4_class,
                                details={"record_type": "A", "ip": ip, "domain": hostname},
                            )
                        )
                except dns.resolver.NXDOMAIN:
                    pass
                except dns.resolver.NoAnswer:
                    pass
                except Exception as exc:
                    warnings.append(f"DNS A lookup failed for {hostname}: {exc}")
            elif "A" not in unmapped_types:
                unmapped_types.add("A")

        if resolve_ipv6:
            if ipv6_class:
                try:
                    answers = resolver.resolve(hostname, "AAAA")
                    for answer in answers:
                        ip = answer.to_text()
                        relations.append(
                            make_relation(
                                e1_name=hostname,
                                e1_class=entry["entry_class"],
                                e2_name=ip,
                                e2_class=ipv6_class,
                                details={"record_type": "AAAA", "ip": ip, "domain": hostname},
                            )
                        )
                except dns.resolver.NXDOMAIN:
                    pass
                except dns.resolver.NoAnswer:
                    pass
                except Exception as exc:
                    warnings.append(f"DNS AAAA lookup failed for {hostname}: {exc}")
            elif "AAAA" not in unmapped_types:
                unmapped_types.add("AAAA")

    if unmapped_types:
        warnings.append(
            f"Some DNS record types were skipped because no mapping exists for them: "
            f"{', '.join(sorted(unmapped_types))}. "
            f"An administrator can add DNS type mappings in the admin site."
        )

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)

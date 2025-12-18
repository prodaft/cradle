from typing import Optional

import dns.resolver
from django.db import models

from entries.enums import RelationReason
from entries.models import Entry, EntryClass, Relation

from ..base import BaseEnricher


class DNSEnricher(BaseEnricher):
    display_name = "DNS"
    settings_fields = {
        "dns_server": models.CharField(default="1.1.1.1"),
        "ipv4_type": models.CharField(default="ip"),
        "ipv6_type": models.CharField(default="ipv6"),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        return None

    def enrich(self, entries: list[Entry]) -> None:
        created = False
        dns_server = self.settings["dns_server"]
        ipv4_type = self.settings.get("ipv4_type", "ip")
        ipv6_type = self.settings.get("ipv6_type", "ipv6")

        ipv4 = EntryClass.objects.filter(subtype=ipv4_type).first()
        ipv6 = EntryClass.objects.filter(subtype=ipv6_type).first()

        resolver = dns.resolver.Resolver()
        resolver.nameservers = [dns_server]

        rels = []

        for entry in entries:
            hostname = entry.name
            ipv4s = []
            ipv6s = []

            if ipv4:
                try:
                    answers = resolver.resolve(hostname, "A")
                    for i in answers:
                        ip, new = Entry.objects.get_or_create(
                            entry_class=ipv4, name=i.to_text()
                        )
                        created = created or new
                        ipv4s.append(ip)
                except Exception:
                    self.request._append_warning(
                        f"DNS A record lookup failed for {hostname}"
                    )

            if ipv6:
                try:
                    answers = resolver.resolve(hostname, "AAAA")
                    for i in answers:
                        ip, new = Entry.objects.get_or_create(
                            entry_class=ipv6, name=i.to_text()
                        )
                        created = created or new
                        ipv6s.append(ip)
                except Exception:
                    self.request._append_warning(
                        f"DNS AAAA record lookup failed for {hostname}"
                    )

            av = self.request.access_vector
            rels.extend(
                [
                    Relation(
                        e1=entry,
                        e2=i,
                        inherit_av=True,
                        content_object=self.request,
                        access_vector=av,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        details={
                            "record": "A",
                            "ip": i.name,
                            "domain": hostname,
                        },
                    )
                    for i in ipv4s
                ]
            )

            rels.extend(
                [
                    Relation(
                        e1=entry,
                        e2=i,
                        inherit_av=True,
                        content_object=self.request,
                        access_vector=av,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        details={
                            "record": "AAAA",
                            "ip": i.name,
                            "domain": hostname,
                        },
                    )
                    for i in ipv6s
                ]
            )

        Relation.objects.bulk_create(rels)

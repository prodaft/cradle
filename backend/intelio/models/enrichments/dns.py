from typing import Optional

from django.db import models
from entries.enums import RelationReason
from entries.models import Entry, EntryClass, Relation
from ..base import BaseEnricher
import dns.resolver


class DNSEnricher(BaseEnricher):
    display_name = "DNS"
    settings_fields = {
        "dns_server": models.CharField(default="1.1.1.1"),
        "ipv4_type": models.CharField(default="ip"),
        "ipv6_type": models.CharField(default="ipv6"),
    }

    def pre_enrich(self, entries: list[Entry], user) -> Optional[str]:
        return None

    def enrich(self, entries: list[Entry], content_object, user) -> bool:
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
                    pass

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
                    pass

            rels.extend(
                [
                    Relation(
                        e1=entry,
                        e2=i,
                        inherit_av=True,
                        content_object=content_object,
                        access_vector=1,
                        reason=RelationReason.ENRICHMENT,
                        details={"enricher": "DNS", "record": "A"},
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
                        content_object=content_object,
                        access_vector=1,
                        reason=RelationReason.ENRICHMENT,
                        details={"enricher": "DNS", "record": "AAAA"},
                    )
                    for i in ipv6s
                ]
            )

        Relation.objects.bulk_create(rels)

        return created

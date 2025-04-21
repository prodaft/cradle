from ..base import BaseDigest


class StixDigest(BaseDigest):
    display_name = "STIX"

    class Meta:
        proxy = True

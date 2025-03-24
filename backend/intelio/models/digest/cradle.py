from ..base import BaseDigest


class CradleDigest(BaseDigest):
    display_name = "CRADLE Report"
    infer_entities = True

    class Meta:
        proxy = True

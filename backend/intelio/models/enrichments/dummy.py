from ..base import BaseEnricher
from django.db import models


class DummyEnricher(BaseEnricher):
    display_name = "Some Enricher"

    settings_fields = {
        "api_key": models.CharField(max_length=255, default=""),
        "username": models.CharField(max_length=255, default=""),
    }

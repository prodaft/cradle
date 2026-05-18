"""Registry of publish strategies (upload to Catalyst, download as HTML/plaintext/JSON)."""

from django.conf import settings

from .catalyst import CatalystPublish
from .html import HTMLPublish
from .json import JSONPublish
from .plaintext import PlaintextPublish

# Map strategy key to factory: (anonymized: bool) -> BasePublishStrategy
PUBLISH_STRATEGIES = {
    "catalyst": lambda anon: CatalystPublish(
        "TLP:RED",
        settings.CATALYST_PUBLISH_CATEGORY,
        settings.CATALYST_PUBLISH_SUBCATEGORY,
        anon,
    ),
    "html": lambda anon: HTMLPublish(anon),
    "json": lambda anon: JSONPublish(anon),
    "plain": lambda anon: PlaintextPublish(anon),
}

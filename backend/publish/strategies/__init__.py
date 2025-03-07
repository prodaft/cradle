from django.conf import settings

from .plaintext import PlaintextPublish

from .html import HTMLPublish
from .catalyst import CatalystPublish
from .json import JSONPublish

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

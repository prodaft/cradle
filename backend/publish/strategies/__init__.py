from django.conf import settings
from .catalyst import CatalystPublish

PUBLISH_STRATEGIES = {
    "catalyst": lambda: CatalystPublish(
        "TLP:RED",
        settings.CATALYST_PUBLISH_CATEGORY,
        settings.CATALYST_PUBLISH_SUBCATEGORY,
    ),
}

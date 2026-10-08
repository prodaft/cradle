"""Registry of publish strategies (download as HTML/plaintext/JSON)."""

from .html import HTMLPublish
from .json import JSONPublish
from .plaintext import PlaintextPublish

# Map strategy key to factory: (anonymized: bool) -> BasePublishStrategy
PUBLISH_STRATEGIES = {
    "html": lambda anon: HTMLPublish(anon),
    "json": lambda anon: JSONPublish(anon),
    "plain": lambda anon: PlaintextPublish(anon),
}

"""Registry of publish strategies (download as HTML, PDF, plaintext, or JSON)."""

from .html import HTMLPublish
from .json import JSONPublish
from .pdf import PDFPublish
from .plaintext import PlaintextPublish

PUBLISH_STRATEGIES = {
    "html": lambda anon: HTMLPublish(anon),
    "json": lambda anon: JSONPublish(anon),
    "pdf": lambda anon: PDFPublish(anon),
    "plain": lambda anon: PlaintextPublish(anon),
}

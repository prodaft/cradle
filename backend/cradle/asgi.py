"""ASGI config for cradle project.

Serves HTTP through Django and WebSockets (live note editing and notification
signals) through Channels.
It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cradle.settings")

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from notes.collab.routing import websocket_urlpatterns as note_websocket_urlpatterns  # noqa: E402
from notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            URLRouter([*note_websocket_urlpatterns, *notification_websocket_urlpatterns])
        ),
    }
)

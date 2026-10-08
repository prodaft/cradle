from django.urls import path

from .consumers import NotificationConsumer

websocket_urlpatterns = [
    path("api/ws/notifications/", NotificationConsumer.as_asgi()),
]

from django.urls import path

from .consumers import NoteCollabConsumer

websocket_urlpatterns = [
    path("api/ws/notes/<uuid:note_id>/", NoteCollabConsumer.as_asgi()),
]

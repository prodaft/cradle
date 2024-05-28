from .views.note_publish_view import NotePublishDetail
from .views.note_view import NoteList, NoteDetail
from django.urls import path

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path(
        "<int:note_id>/publishable/",
        NotePublishDetail.as_view(),
        name="note_publish_detail",
    ),
    path("<int:note_id>/", NoteDetail.as_view(), name="note_detail"),
]

from django.urls import path

from .views import CollabAuthorizeView, CollabNoteApplyView, CollabNoteStateView

urlpatterns = [
    path("collab/authorize/", CollabAuthorizeView.as_view(), name="collab-authorize"),
    path(
        "collab/notes/<uuid:note_id>/state/",
        CollabNoteStateView.as_view(),
        name="collab-note-state",
    ),
    path(
        "collab/notes/<uuid:note_id>/apply/",
        CollabNoteApplyView.as_view(),
        name="collab-note-apply",
    ),
]

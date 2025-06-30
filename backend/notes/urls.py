from .views.note_view import NoteList, NoteDetail, NoteFiles
from .views.snippet_view import (
    UserSnippetsListCreateView,
    AllAccessibleSnippetsListView,
    SnippetDetailView,
)
from django.urls import path

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path("files/", NoteFiles.as_view(), name="note_files"),
    # Snippet endpoints
    path(
        "snippets/", AllAccessibleSnippetsListView.as_view(), name="snippets_accessible"
    ),
    path(
        "snippets/user/<str:user_id>/",
        UserSnippetsListCreateView.as_view(),
        name="snippets_user_by_id",
    ),
    path(
        "snippets/<str:snippet_id>/",
        SnippetDetailView.as_view(),
        name="snippet_detail",
    ),
    path("<str:note_id_s>/", NoteDetail.as_view(), name="note_detail"),
]

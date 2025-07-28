from .views.note_view import NoteList, NoteDetail, NoteFiles, NoteGraph
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
    path("<uuid:note_id>/", NoteDetail.as_view(), name="note_detail"),
    path("<uuid:note_id>/graph", NoteGraph.as_view(), name="note_graph"),
]

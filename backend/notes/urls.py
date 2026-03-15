"""URL routing for notes app: notes, snippets, files, graph."""

from django.urls import path

from .views.note_view import NoteDetail, NoteFiles, NoteFinalize, NoteGraph, NoteList, NoteRelink, NoteRelinkAll
from .views.snippet_view import (
    AllAccessibleSnippetsListView,
    SnippetDetailView,
    UserSnippetsListCreateView,
)

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path("relink/", NoteRelinkAll.as_view(), name="note_relink_all"),
    path("files/", NoteFiles.as_view(), name="note_files"),
    # Snippet endpoints
    path("snippets/", AllAccessibleSnippetsListView.as_view(), name="snippets_accessible"),
    path(
        "snippets/user/<str:user_id>/",
        UserSnippetsListCreateView.as_view(),
        name="snippets_user_by_id",
    ),
    path(
        "snippets/<uuid:snippet_id>/",
        SnippetDetailView.as_view(),
        name="snippet_detail",
    ),
    path("<uuid:note_id>/", NoteDetail.as_view(), name="note_detail"),
    path("<uuid:note_id>/finalize/", NoteFinalize.as_view(), name="note_finalize"),
    path("<uuid:note_id>/graph/", NoteGraph.as_view(), name="note_graph"),
    path("<uuid:note_id>/relink/", NoteRelink.as_view(), name="note_relink"),
]

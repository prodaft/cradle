"""URL routing for notes app: notes, snippets, files, graph, history, access requests."""

from django.urls import path

from .views.note_access_view import RequestNoteAccess
from .views.note_view import (
    FileDetail,
    NoteDetail,
    NoteFiles,
    NoteFinalize,
    NoteGraph,
    NoteHistory,
    NoteList,
    NoteRelink,
    NoteRelinkAll,
)
from .views.snippet_view import (
    AllAccessibleSnippetsListView,
    SnippetDetailView,
    UserSnippetsListCreateView,
)

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path("relink/", NoteRelinkAll.as_view(), name="note_relink_all"),
    path("files/", NoteFiles.as_view(), name="note_files"),
    path("files/<uuid:file_id>/", FileDetail.as_view(), name="note_file_detail"),
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
    path("<uuid:note_id>/history/", NoteHistory.as_view(), name="note_history"),
    path("<uuid:note_id>/graph/", NoteGraph.as_view(), name="note_graph"),
    path("<uuid:note_id>/relink/", NoteRelink.as_view(), name="note_relink"),
    path("<uuid:note_id>/access/request/", RequestNoteAccess.as_view(), name="note_request_access"),
]

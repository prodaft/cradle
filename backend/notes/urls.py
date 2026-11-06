"""URL routing for notes app: notes, snippets, files, graph, history, shares, access requests."""

from django.urls import path

from .views.note_access_view import RequestNoteAccess
from .views.note_share_view import NoteShareCandidates, NoteShareDetail, NoteShareList
from .views.note_view import (
    NoteDetail,
    NoteGraph,
    NoteHistory,
    NoteList,
    NotePublish,
    NoteRelink,
    NoteRelinkAll,
    NoteUnpublish,
)
from .views.snippet_view import (
    AllAccessibleSnippetsListView,
    SnippetDetailView,
    SystemSnippetsView,
)

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path("relink/", NoteRelinkAll.as_view(), name="note_relink_all"),
    # Snippet endpoints
    path("snippets/", AllAccessibleSnippetsListView.as_view(), name="snippets_accessible"),
    path("snippets/system/", SystemSnippetsView.as_view(), name="snippets_system"),
    path(
        "snippets/<uuid:snippet_id>/",
        SnippetDetailView.as_view(),
        name="snippet_detail",
    ),
    path("<uuid:note_id>/", NoteDetail.as_view(), name="note_detail"),
    path("<uuid:note_id>/publish/", NotePublish.as_view(), name="note_publish"),
    path("<uuid:note_id>/unpublish/", NoteUnpublish.as_view(), name="note_unpublish"),
    path("<uuid:note_id>/history/", NoteHistory.as_view(), name="note_history"),
    path("<uuid:note_id>/graph/", NoteGraph.as_view(), name="note_graph"),
    path("<uuid:note_id>/relink/", NoteRelink.as_view(), name="note_relink"),
    path("<uuid:note_id>/shares/", NoteShareList.as_view(), name="note_share_list"),
    path("<uuid:note_id>/shares/candidates/", NoteShareCandidates.as_view(), name="note_share_candidates"),
    path("<uuid:note_id>/shares/<uuid:user_id>/", NoteShareDetail.as_view(), name="note_share_detail"),
    path("<uuid:note_id>/access/requests/", RequestNoteAccess.as_view(), name="note_request_access"),
]

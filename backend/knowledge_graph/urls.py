from django.urls import path

from .views import (
    GraphInaccessibleView,
    GraphNeighborsView,
    GraphPathFindView,
    KnowledgeGraphView,
)

urlpatterns = [
    path("", KnowledgeGraphView.as_view(), name="knowledge_graph"),
    path("paths/", GraphPathFindView.as_view(), name="graph_path_find"),
    path("neighbors/", GraphNeighborsView.as_view(), name="graph_neighbors_query"),
    path(
        "inaccessible/",
        GraphInaccessibleView.as_view(),
        name="graph_inaccessible_query",
    ),
]

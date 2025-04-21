from django.urls import path
from .views import (
    FetchGraphView,
    GraphPathFindView,
    GraphInaccessibleView,
    GraphNeighborsView,
)

urlpatterns = [
    path("pathfind/", GraphPathFindView.as_view(), name="graph_pathfind_query"),
    path("neighbors/", GraphNeighborsView.as_view(), name="graph_neighbors_query"),
    path(
        "inaccessible/",
        GraphInaccessibleView.as_view(),
        name="graph_inaccessible_query",
    ),
    path(
        "fetch/",
        FetchGraphView.as_view(),
        name="graph_fetch",
    ),
]

from django.urls import path
from .views import (
    KnowledgeGraphView,
    GraphInaccessibleView,
    GraphNeighborsView,
)

urlpatterns = [
    path("", KnowledgeGraphView.as_view(), name="knowledge_graph"),
    path("neighbors/", GraphNeighborsView.as_view(), name="graph_neighbors_query"),
    path(
        "inaccessible/",
        GraphInaccessibleView.as_view(),
        name="graph_inaccessible_query",
    ),
]

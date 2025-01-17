from django.urls import path
from .views import GraphTraverseView

urlpatterns = [
    path("query/", GraphTraverseView.as_view(), name="graph_traverse_query"),
]

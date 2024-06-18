from django.urls import path
from .views import KnowledgeGraphList

urlpatterns = [path("", KnowledgeGraphList.as_view(), name="knowledge_graph_list")]

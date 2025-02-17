from django.urls import path
from .views.query_view import AdvancedQueryView, EntryListQuery

urlpatterns = [
    path("", EntryListQuery.as_view(), name="query_list"),
    path("advanced/", AdvancedQueryView.as_view(), name="advanced_query_list"),
]

from django.urls import path
from .views.query_view import EntryListQuery

urlpatterns = [
    path("", EntryListQuery.as_view(), name="query_list"),
]

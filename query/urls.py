from django.urls import path
from .views.query_view import QueryList

urlpatterns = [
    path("", QueryList.as_view(), name="query_list"),
]

"""Per-user access routes, mounted under /users/<user_id>/access/."""

from django.urls import path

from .views.access_view import UserAccessList

urlpatterns = [
    path("", UserAccessList.as_view(), name="user_access_list"),
]

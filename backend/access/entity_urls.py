"""Per-entity user access routes, mounted under /entries/entities/<entity_id>/."""

from django.urls import path

from .views.access_view import EntityAccessList
from .views.request_access_view import RequestAccess
from .views.update_access_view import UpdateAccess

urlpatterns = [
    path("access/users/", EntityAccessList.as_view(), name="entity_access_list"),
    path("access/users/<uuid:user_id>/", UpdateAccess.as_view(), name="update_access"),
    path("access/requests/", RequestAccess.as_view(), name="request_access"),
]

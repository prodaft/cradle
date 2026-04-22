"""URL routing for access management.

Routes:
- user/<uuid:user_id>/ - List entities and access types for a user (admin)
- entity/<int:entity_id>/ - List users and access types for an entity (admin)
- request/<int:entity_id>/ - Request access to an entity
- user/<uuid:user_id>/<int:entity_id>/ - Update a user's access for an entity
"""

from django.urls import path

from .views.access_stream_views import EntityAccessListStreamView, UserAccessListStreamView
from .views.access_view import EntityAccessList, UserAccessList
from .views.request_access_view import RequestAccess
from .views.update_access_view import UpdateAccess

urlpatterns = [
    path(
        "user/<uuid:user_id>/<int:entity_id>/",
        UpdateAccess.as_view(),
        name="update_access",
    ),
    path(
        "user/<uuid:user_id>/stream/",
        UserAccessListStreamView.as_view(),
        name="user_access_list_stream",
    ),
    path("user/<uuid:user_id>/", UserAccessList.as_view(), name="user_access_list"),
    path(
        "entity/<int:entity_id>/stream/",
        EntityAccessListStreamView.as_view(),
        name="entity_access_list_stream",
    ),
    path(
        "entity/<int:entity_id>/",
        EntityAccessList.as_view(),
        name="entity_access_list",
    ),
    path("request/<int:entity_id>/", RequestAccess.as_view(), name="request_access"),
]

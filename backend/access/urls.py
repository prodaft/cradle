from django.urls import path

from .views.access_view import EntityAccessList, UserAccessList
from .views.request_access_view import RequestAccess
from .views.update_access_view import UpdateAccess

urlpatterns = [
    path(
        "user/<uuid:user_id>/<int:entity_id>/",
        UpdateAccess.as_view(),
        name="update_access",
    ),
    path("user/<uuid:user_id>/", UserAccessList.as_view(), name="access_list"),
    path(
        "entity/<int:entity_id>/",
        EntityAccessList.as_view(),
        name="entity_access_list",
    ),
    path("request/<int:entity_id>/", RequestAccess.as_view(), name="request_access"),
]

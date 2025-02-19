from django.urls import path
from .views.access_view import AccessList
from .views.request_access_view import RequestAccess
from .views.update_access_view import UpdateAccess

urlpatterns = [
    path(
        "<uuid:user_id>/<uuid:entity_id>/",
        UpdateAccess.as_view(),
        name="update_access",
    ),
    path("<uuid:user_id>/", AccessList.as_view(), name="access_list"),
    path("request/<uuid:entity_id>/", RequestAccess.as_view(), name="request_access"),
]

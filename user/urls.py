from rest_framework_simplejwt.views import TokenObtainPairView

from django.urls import path
from .views import user_view, access_view

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="user_login"),
    path("", user_view.UserList.as_view(), name="user_list"),
    path(
        "<int:user_id>/",
        user_view.UserDetail.as_view(),
        name="user_detail",
    ),
    path(
        "<int:user_id>/access/<int:case_id>/",
        access_view.UpdateAccess.as_view(),
        name="update_access",
    ),
    path(
        "<int:user_id>/access/",
        access_view.AccessList.as_view(),
        name="access_list"
    )
]

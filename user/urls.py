from .views.token_view import TokenObtainPairLogView, TokenRefreshLogView

from django.urls import path
from .views import user_view

urlpatterns = [
    path("login/", TokenObtainPairLogView.as_view(), name="user_login"),
    path("refresh/", TokenRefreshLogView.as_view(), name="user_refresh"),
    path("", user_view.UserList.as_view(), name="user_list"),
    path(
        "<int:user_id>/",
        user_view.UserDetail.as_view(),
        name="user_detail",
    ),
]

from django.urls import path

from .views import user_views, admin_views, router_views

urlpatterns = [
    path("login/", user_views.login_user, name="login"),
    path("logout/", user_views.logout_user, name="logout"),
    path("", router_views.route_users, name="create/get-all"),
    path("<int:user_id>/", admin_views.delete_user, name="delete"),
]

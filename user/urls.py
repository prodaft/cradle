from django.urls import path

from . import views

urlpatterns = [
    path("unauthorized/", views.login_failed_user, name="unauthorized"),
    path("login/", views.login_user, name="login"),
    path("logout/", views.logout_user, name="logout"),
    path("", views.create_user, name="create"),
]

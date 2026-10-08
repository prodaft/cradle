"""URL routing for management settings and admin actions."""

from django.urls import path

from .views import ActionView, SettingsView

urlpatterns = [
    path("settings/", SettingsView.as_view(), name="settings"),
    path("actions/<str:action_name>/", ActionView.as_view(), name="perform_action"),
]

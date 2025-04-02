from django.urls import path
from .views import SettingsView, ActionView

urlpatterns = [
    path("settings/", SettingsView.as_view(), name="settings"),
    path("actions/<str:action_name>", ActionView.as_view(), name="perform-action"),
]

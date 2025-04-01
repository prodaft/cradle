from django.urls import path
from .views import SettingListCreateView, ActionView

urlpatterns = [
    path("settings/", SettingListCreateView.as_view(), name="settings-list-create"),
    path("actions/<str:action_name>", ActionView.as_view(), name="perform-action"),
]

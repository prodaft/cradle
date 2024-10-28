from django.urls import path
from .views import EventLogListView

urlpatterns = [
    path("", EventLogListView.as_view(), name="event-log-list"),
]


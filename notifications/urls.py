from .views.notification_view import NotificationList
from django.urls import path

urlpatterns = [
    path("", NotificationList.as_view(), name="notification_list"),
]

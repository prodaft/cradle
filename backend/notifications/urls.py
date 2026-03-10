"""URL configuration for notification endpoints."""

from django.urls import path

from .views.notification_view import (
    NotificationDetail,
    NotificationList,
    NotificationUnread,
)

urlpatterns = [
    path("", NotificationList.as_view(), name="notification_list"),
    path("unread-count/", NotificationUnread.as_view(), name="notification_unread"),
    path(
        "<uuid:notification_id>/",
        NotificationDetail.as_view(),
        name="notification_detail",
    ),
]

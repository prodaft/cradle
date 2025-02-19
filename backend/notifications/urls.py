from .views.notification_view import (
    NotificationList,
    NotificationDetail,
    NotificationUnread,
)
from django.urls import path

urlpatterns = [
    path("", NotificationList.as_view(), name="notification_list"),
    path(
        "<uuid:notification_id>/",
        NotificationDetail.as_view(),
        name="notification_detail",
    ),
    path("unread-count/", NotificationUnread.as_view(), name="notification_unread"),
]

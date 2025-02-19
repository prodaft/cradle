from .views.publish_notes import PublishView
from django.urls import path

urlpatterns = [
    path(
        "<str:strategy_name>/",
        PublishView.as_view(),
        name="note_publish_detail",
    ),
]

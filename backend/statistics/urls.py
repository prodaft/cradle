"""URL routing for statistics endpoints."""

from django.urls import path

from .views.statistics_view import StatisticsList

urlpatterns = [
    path(
        "",
        StatisticsList.as_view(),
        name="home_page_statistics",
    )
]

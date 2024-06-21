from django.urls import path

from cradle_statistics.views.statistics_view import StatisticsList


urlpatterns = [
    path(
        "",
        StatisticsList.as_view(),
        name="home_page_statistics",
    )
]

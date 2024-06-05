from django.urls import path
from .views import actor_views, case_views

urlpatterns = [
    path("cases/", case_views.CaseList.as_view(), name="case_list"),
    path("cases/<int:case_id>/", case_views.CaseDetail.as_view(), name="case_detail"),
    path("actors/", actor_views.ActorList.as_view(), name="actor_list"),
    path(
        "actors/<int:actor_id>/", actor_views.ActorDetail.as_view(), name="actor_detail"
    ),
]

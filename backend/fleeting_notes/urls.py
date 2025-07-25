from django.urls import path

from .views import (
    FleetingNotesList,
    FleetingNotesDetail,
    FleetingNotesFinal,
)

urlpatterns = [
    path("", FleetingNotesList.as_view(), name="fleeting_notes_list"),
    path("<uuid:id>/", FleetingNotesDetail.as_view(), name="fleeting_notes_detail"),
    path("<uuid:id>/final/", FleetingNotesFinal.as_view(), name="fleeting_notes_final"),
]

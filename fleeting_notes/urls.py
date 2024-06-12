from django.urls import path

from fleeting_notes.views.fleeting_notes_view import (
    FleetingNotesList,
    FleetingNotesDetail,
)
from fleeting_notes.views.fleeting_notes_final_view import FleetingNotesFinal

urlpatterns = [
    path("", FleetingNotesList.as_view(), name="fleeting_notes_list"),
    path("<int:pk>/", FleetingNotesDetail.as_view(), name="fleeting_notes_detail"),
    path("<int:pk>/final/", FleetingNotesFinal.as_view(), name="fleeting_notes_final"),
]

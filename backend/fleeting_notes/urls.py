from django.urls import path

from fleeting_notes.views.fleeting_notes_view import (
    FleetingNotesList,
    FleetingNotesDetail,
)
from fleeting_notes.views.fleeting_notes_final_view import FleetingNotesFinal

urlpatterns = [
    path("", FleetingNotesList.as_view(), name="fleeting_notes_list"),
    path("<uuid:pk>/", FleetingNotesDetail.as_view(), name="fleeting_notes_detail"),
    path("<uuid:pk>/final/", FleetingNotesFinal.as_view(), name="fleeting_notes_final"),
]

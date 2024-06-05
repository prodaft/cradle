from django.urls import path

from fleeting_notes.views import FleetingNotesList

urlpatterns = [
    path("", FleetingNotesList.as_view(), name="fleeting_notes_list"),
]

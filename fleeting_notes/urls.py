from django.urls import path

from fleeting_notes.views import FleetingNotesList, FleetingNotesDetail

urlpatterns = [
    path("", FleetingNotesList.as_view(), name="fleeting_notes_list"),
    path("<int:pk>/", FleetingNotesDetail.as_view(), name="fleeting_notes_detail"),
]

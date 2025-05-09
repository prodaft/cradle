from .views.note_view import NoteList, NoteDetail, NoteFiles
from django.urls import path

urlpatterns = [
    path("", NoteList.as_view(), name="note_list"),
    path("files/", NoteFiles.as_view(), name="note_files"),
    path("<str:note_id_s>/", NoteDetail.as_view(), name="note_detail"),
]

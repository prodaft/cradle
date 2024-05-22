from .views.note_view import NoteList
from django.urls import path

urlpatterns = [path("", NoteList.as_view(), name="note_list")]

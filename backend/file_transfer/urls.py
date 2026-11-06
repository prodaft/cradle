"""URL routing for the files API: listing, uploads (initiate/finalize), and per-file detail, entries, download, process and delete."""

from django.urls import path

from notes.views.note_view import FileEntries, NoteFiles

from .views import FileDetail, FileDownload, FileProcess, FileUpload, FileUploadFinalize

urlpatterns = [
    path("", NoteFiles.as_view(), name="note_files"),
    path("uploads/", FileUpload.as_view(), name="file_upload"),
    path("uploads/<uuid:upload_id>/finalize/", FileUploadFinalize.as_view(), name="file_upload_finalize"),
    path("<uuid:file_id>/", FileDetail.as_view(), name="file_detail"),
    path("<uuid:file_id>/entries/", FileEntries.as_view(), name="note_file_entries"),
    path("<uuid:file_id>/download/", FileDownload.as_view(), name="file_download"),
    path("<uuid:file_id>/process/", FileProcess.as_view(), name="file_process"),
]

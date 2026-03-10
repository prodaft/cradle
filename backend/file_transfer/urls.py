"""URL routing for file transfer API.

Endpoints: upload (initiate/finalize), download, delete, process.
"""

from django.urls import path

from .views import FileDelete, FileDownload, FileProcess, FileUpload, FileUploadFinalize

urlpatterns = [
    path("upload/", FileUpload.as_view(), name="file_upload"),
    path(
        "upload/<uuid:upload_id>/finalize/",
        FileUploadFinalize.as_view(),
        name="file_upload_finalize",
    ),
    path("download/", FileDownload.as_view(), name="file_download"),
    path("delete/", FileDelete.as_view(), name="file_delete"),
    path("process/", FileProcess.as_view(), name="file_process"),
]

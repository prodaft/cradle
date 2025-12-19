from django.urls import path

from .views import FileDelete, FileDownload, FileProcess, FileUpload

urlpatterns = [
    path("upload/", FileUpload.as_view(), name="file_upload"),
    path("download/", FileDownload.as_view(), name="file_download"),
    path("delete/", FileDelete.as_view(), name="file_delete"),
    path("process/", FileProcess.as_view(), name="file_process"),
]

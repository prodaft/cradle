from django.urls import path
from .views import FileUpload, FileDownload, FileProcess

urlpatterns = [
    path("upload/", FileUpload.as_view(), name="file_upload"),
    path("download/", FileDownload.as_view(), name="file_download"),
    path("process/", FileProcess.as_view(), name="file_process"),
]

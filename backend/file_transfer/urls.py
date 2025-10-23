from django.urls import path
from .views import FileUpload, FileDownload

urlpatterns = [
    path("upload/", FileUpload.as_view(), name="file_upload"),
    path("download/", FileDownload.as_view(), name="file_download"),
]

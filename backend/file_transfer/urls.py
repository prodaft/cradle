from django.urls import path
from .views import FileUpload, FileDownload, FileDelete

urlpatterns = [
    path("upload/", FileUpload.as_view(), name="file_upload"),
    path("download/", FileDownload.as_view(), name="file_download"),
    path("delete/", FileDelete.as_view(), name="file_delete"),
]

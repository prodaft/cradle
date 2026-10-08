"""Admin configuration for file transfer models."""

from django.contrib import admin

from .models import FileReference


@admin.register(FileReference)
class FileReferenceAdmin(admin.ModelAdmin):
    """Admin for FileReference: list, search, and inspect file metadata."""

    list_display = (
        "id",
        "file_name",
        "minio_file_name",
        "bucket_name",
        "note",
    )
    search_fields = ("file_name", "minio_file_name", "bucket_name")
    list_filter = ("bucket_name",)
    readonly_fields = ("id",)

from django.contrib import admin
from .models import FileReference


@admin.register(FileReference)
class FileReferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "file_name",
        "minio_file_name",
        "bucket_name",
        "note",
        "fleeting_note",
    )
    search_fields = ("file_name", "minio_file_name", "bucket_name")
    list_filter = ("bucket_name",)
    readonly_fields = ("id",)

    def to_dict_display(self, obj):
        return obj.to_dict()

    # Optional method to display the dictionary representation in the admin interface
    to_dict_display.short_description = "Dictionary Representation"

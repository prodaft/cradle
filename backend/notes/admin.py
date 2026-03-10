"""Django admin for Note and ArchivedNote models."""

from django.contrib import admin

from .models import ArchivedNote, Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin for Note model: list, filter, search, and save hooks."""

    list_display = (
        "id",
        "content",
        "timestamp",
        "author",
        "editor",
        "edit_timestamp",
    )
    list_filter = ("timestamp", "author", "editor")
    search_fields = ("content", "author__username", "editor__username")
    readonly_fields = ("id", "timestamp", "edit_timestamp")

    def save_model(self, request, obj, form, change):
        """Set author on create, editor on update."""
        if not obj.pk:
            obj.author = request.user  # Set the author when creating
        else:
            obj.editor = request.user  # Update the editor on edit
        super().save_model(request, obj, form, change)


@admin.register(ArchivedNote)
class ArchivedNoteAdmin(admin.ModelAdmin):
    """Admin for ArchivedNote model."""

    list_display = ("id", "content", "timestamp")
    list_filter = ("timestamp",)
    search_fields = ("content",)
    readonly_fields = ("id", "timestamp")

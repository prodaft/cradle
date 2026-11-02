"""Django admin for Note and ArchivedNote models."""

from django.contrib import admin

from .models import ArchivedNote, Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin for Note model: list, filter, search, and save hooks."""

    list_display = (
        "id",
        "content",
        "author",
        "editor",
        "created_at",
        "updated_at",
    )
    list_filter = ("author", "editor", "created_at")
    search_fields = ("content", "author__username", "editor__username")
    readonly_fields = ("id", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        """Set author on create, editor on update."""
        if not obj.pk:
            obj.author = request.user
        else:
            obj.editor = request.user
        super().save_model(request, obj, form, change)


@admin.register(ArchivedNote)
class ArchivedNoteAdmin(admin.ModelAdmin):
    """Admin for ArchivedNote model."""

    list_display = ("id", "content", "archived_at")
    list_filter = ("archived_at",)
    search_fields = ("content",)
    readonly_fields = ("id", "archived_at")

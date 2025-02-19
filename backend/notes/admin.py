from django.contrib import admin
from .models import Note, ArchivedNote


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "content",
        "publishable",
        "timestamp",
        "author",
        "editor",
        "edit_timestamp",
    )
    list_filter = ("publishable", "timestamp", "author", "editor")
    search_fields = ("content", "author__username", "editor__username")
    readonly_fields = ("id", "timestamp", "edit_timestamp")

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving the note."""
        if not obj.pk:
            obj.author = request.user  # Set the author when creating
        else:
            obj.editor = request.user  # Update the editor on edit
        super().save_model(request, obj, form, change)


@admin.register(ArchivedNote)
class ArchivedNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "content", "publishable", "timestamp")
    list_filter = ("publishable", "timestamp")
    search_fields = ("content",)
    readonly_fields = ("id", "timestamp")

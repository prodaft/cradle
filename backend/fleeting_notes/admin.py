from django.contrib import admin
from .models import FleetingNote


@admin.register(FleetingNote)
class FleetingNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "content", "last_edited", "user")
    search_fields = ("content", "user__username", "user__email")
    list_filter = ("last_edited", "user")
    readonly_fields = ("id", "last_edited")

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving a FleetingNote."""
        super().save_model(request, obj, form, change)

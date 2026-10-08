"""Django admin configuration for event logs."""

from django.contrib import admin

from .models import EventLog


class EventLogAdmin(admin.ModelAdmin):
    """Read-only admin for EventLog. Logs are immutable and cannot be added manually."""

    list_display = (
        "id",
        "timestamp",
        "type",
        "user",
        "content_type",
        "object_id",
        "src_log",
    )
    list_filter = ("type", "timestamp", "user")
    search_fields = ("type", "user__username", "content_type__model", "object_id")
    readonly_fields = (
        "id",
        "timestamp",
        "type",
        "user",
        "details",
        "src_log",
        "content_type",
        "object_id",
        "content_object",
    )
    ordering = ["-timestamp"]

    fieldsets = (
        (None, {"fields": ("id", "timestamp", "type", "user", "details")}),
        ("Source Log", {"fields": ("src_log",)}),
        ("Content Object", {"fields": ("content_type", "object_id", "content_object")}),
    )

    def has_add_permission(self, request, obj=None):
        """Disallow adding EventLogs manually; they are created by the application."""
        return False

    def has_change_permission(self, request, obj=None):
        """Disallow editing; event logs are immutable."""
        return False


admin.site.register(EventLog, EventLogAdmin)

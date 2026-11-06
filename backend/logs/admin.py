"""Django admin configuration for event logs."""

from django.contrib import admin

from .models import EventLog


class EventLogAdmin(admin.ModelAdmin):
    """Read-only admin for EventLog. Logs are immutable and cannot be added manually."""

    list_display = (
        "id",
        "type",
        "src_log",
        "content_type",
        "object_id",
        "user",
        "created_at",
    )
    list_filter = ("type", "user", "created_at")
    search_fields = ("type", "content_type__model", "object_id", "user__username")
    readonly_fields = (
        "id",
        "type",
        "details",
        "src_log",
        "content_type",
        "object_id",
        "content_object",
        "user",
        "created_at",
    )
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("id", "type", "details")}),
        ("Source Log", {"fields": ("src_log",)}),
        ("Content Object", {"fields": ("content_type", "object_id", "content_object")}),
        ("Audit", {"fields": ("user", "created_at")}),
    )

    def has_add_permission(self, request, obj=None):
        """Disallow adding EventLogs manually; they are created by the application."""
        return False

    def has_change_permission(self, request, obj=None):
        """Disallow editing; event logs are immutable."""
        return False


admin.site.register(EventLog, EventLogAdmin)

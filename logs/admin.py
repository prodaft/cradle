from django.contrib import admin
from .models import EventLog


class EventLogAdmin(admin.ModelAdmin):
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
    readonly_fields = ("timestamp",)
    ordering = ["-timestamp"]

    fieldsets = (
        (None, {"fields": ("id", "timestamp", "type", "user", "details")}),
        ("Source Log", {"fields": ("src_log",)}),
        ("Content Object", {"fields": ("content_type", "object_id", "content_object")}),
    )

    def has_add_permission(self, request, obj=None):
        # Disallow adding new EventLogs directly in the admin
        return False

    def has_change_permission(self, request, obj=None):
        # Event logs are immutable; changes are not allowed
        return False


admin.site.register(EventLog, EventLogAdmin)

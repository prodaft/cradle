from django.contrib import admin
from .models import MessageNotification, AccessRequestNotification


@admin.register(MessageNotification)
class MessageNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "message",
        "user",
        "timestamp",
        "is_unread",
        "is_marked_unread",
    )
    search_fields = ("message", "user__username", "user__email")
    list_filter = ("is_unread", "is_marked_unread", "timestamp")
    readonly_fields = ("id", "timestamp")

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving a MessageNotification."""
        super().save_model(request, obj, form, change)


@admin.register(AccessRequestNotification)
class AccessRequestNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "message",
        "user",
        "requesting_user",
        "entity",
        "timestamp",
        "is_unread",
        "is_marked_unread",
    )
    search_fields = (
        "message",
        "user__username",
        "requesting_user__username",
        "entity__name",
    )
    list_filter = ("is_unread", "is_marked_unread", "timestamp")
    readonly_fields = ("id", "timestamp")

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving an AccessRequestNotification."""
        super().save_model(request, obj, form, change)

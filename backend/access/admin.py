"""Django admin configuration for the access app."""

from django.contrib import admin

from .models import Access


@admin.register(Access)
class AccessAdmin(admin.ModelAdmin):
    """Admin for Access model: user access privileges (read, read-write, none) per entity."""

    list_display = ("id", "user", "entity", "access_type")
    fieldsets = (
        (
            None,
            {
                "fields": ("id", "user", "entity", "access_type"),
                "description": "Maps a user to an entity with a permission level. Entity may be null for unscoped access.",
            },
        ),
    )
    list_filter = ("access_type",)
    readonly_fields = ("id",)
    search_fields = ("user__username", "entity__name", "access_type")
    ordering = ("user", "entity")

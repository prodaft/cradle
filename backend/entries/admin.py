"""Django admin configuration for the entries app."""

from django.contrib import admin

from .models import Entry, EntryClass
from .tasks import refresh_edges_materialized_view


@admin.register(EntryClass)
class EntryClassAdmin(admin.ModelAdmin):
    """Admin for EntryClass: type, subtype, created_at; search and filter by type."""

    list_display = ("type", "subtype", "created_at")
    list_filter = ("type", "created_at")
    readonly_fields = ("created_at",)
    search_fields = ("subtype", "type")
    date_hierarchy = "created_at"


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    """Admin for Entry: display name, class, visibility, created_at; search by name/class/type; readonly timestamps and acvec_offset."""

    list_display = ("id", "name", "entry_class", "is_public", "created_at")
    list_filter = ("is_public", "entry_class")
    readonly_fields = ("id", "acvec_offset", "created_at")
    search_fields = ("name", "entry_class__subtype", "entry_class__type")
    date_hierarchy = "created_at"

    def delete_model(self, request, obj):
        """Delete like the API does, so notes drop their links to the entry and recompute their access."""
        obj.delete_renaming(request.user.id)
        refresh_edges_materialized_view.apply_async()

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.delete_renaming(request.user.id)
        refresh_edges_materialized_view.apply_async()

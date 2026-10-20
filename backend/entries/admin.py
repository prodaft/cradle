"""Django admin configuration for the entries app."""

from django.contrib import admin

from .models import Entry, EntryClass


@admin.register(EntryClass)
class EntryClassAdmin(admin.ModelAdmin):
    """Admin for EntryClass: type, subtype, timestamp; search and filter by type."""

    list_display = ("type", "subtype", "timestamp")
    list_filter = ("type", "timestamp")
    readonly_fields = ("timestamp",)
    search_fields = ("subtype", "type")
    date_hierarchy = "timestamp"


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    """Admin for Entry: display name, class, visibility, last_seen; search by name/class/type; readonly timestamps and acvec_offset."""

    list_display = ("id", "name", "entry_class", "is_public", "last_seen")
    list_filter = ("is_public", "entry_class")
    readonly_fields = ("id", "created_at", "last_seen", "acvec_offset")
    search_fields = ("name", "entry_class__subtype", "entry_class__type")
    date_hierarchy = "last_seen"

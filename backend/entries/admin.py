from django.contrib import admin
from .models import EntryClass, Entry


@admin.register(EntryClass)
class EntryClassAdmin(admin.ModelAdmin):
    list_display = ("type", "subtype", "timestamp")
    search_fields = ("subtype", "type")
    list_filter = ("type", "timestamp")
    readonly_fields = ("timestamp",)

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving an EntryClass."""
        super().save_model(request, obj, form, change)


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "entry_class", "is_public", "timestamp")
    search_fields = ("name", "entry_class__subtype")
    list_filter = ("is_public", "timestamp", "entry_class")
    readonly_fields = ("id", "timestamp")

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving an Entry."""
        super().save_model(request, obj, form, change)

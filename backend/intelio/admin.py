"""Django admin for IntelIO enrichment models."""

from django.contrib import admin

from intelio.models import EnricherSettings, EnrichmentRequest


@admin.register(EnricherSettings)
class EnricherSettingsAdmin(admin.ModelAdmin):
    list_display = ("enricher_type", "enabled", "id")
    list_filter = ("enabled", "enricher_type")
    search_fields = ("enricher_type",)
    filter_horizontal = ("for_eclasses",)


@admin.register(EnrichmentRequest)
class EnrichmentRequestAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "user", "created_at", "completed_at")
    list_filter = ("status", "created_at")
    search_fields = ("title", "id")
    readonly_fields = ("id", "created_at")
    autocomplete_fields = ("user",)
    filter_horizontal = ("enrichers_settings", "entities")

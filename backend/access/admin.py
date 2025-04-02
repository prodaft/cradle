from django.contrib import admin
from .models import Access


@admin.register(Access)
class AccessAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "access_type")
    list_filter = ("access_type",)
    readonly_fields = ("id",)

    def save_model(self, request, obj, form, change):
        """Override to handle any additional logic when saving an Access."""
        super().save_model(request, obj, form, change)

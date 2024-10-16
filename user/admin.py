from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.urls import path

from file_transfer.utils import MinioClient
from .models import CradleUser
from django.utils.html import format_html
from django.shortcuts import redirect


class CradleUserAdmin(UserAdmin):
    # Fields to display in the admin interface
    list_display = (
        "username",
        "email",
        "is_staff",
        "is_active",
        "vt_api_key",
        "catalyst_api_key",
    )

    # Fields to search by in the admin interface
    search_fields = ("username", "email")

    # Define the fields and their grouping in the form layout for user creation and modification
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal Info", {"fields": ("email",)}),
        ("API Keys", {"fields": ("vt_api_key", "catalyst_api_key")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    # Fields to be displayed when creating a new user
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "password1",
                    "password2",
                    "vt_api_key",
                    "catalyst_api_key",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    # Define which fields are read-only
    readonly_fields = ("last_login", "date_joined")

    # Specify the order in which users are listed
    ordering = ("email",)

    # Custom button rendering in the list_display
    def create_minio_button(self, obj):
        return format_html(
            '<a class="button" href="{}">Create Minio Bucket</a>',
            f"/admin/create_minio_bucket/{obj.pk}/",
        )

    create_minio_button.short_description = "Create Minio Bucket"
    create_minio_button.allow_tags = True

    # Define custom admin URL patterns for action
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "create_minio_bucket/<int:user_id>/",
                self.admin_site.admin_view(self.create_minio_bucket),
            )
        ]
        return custom_urls + urls

    def create_minio_bucket(self, request, user_id):
        MinioClient().create_user_bucket(user_id)

        return redirect(f"/admin/app/cradleuser/{user_id}/change/")


# Register the CradleUser model and the custom admin interface
admin.site.register(CradleUser, CradleUserAdmin)

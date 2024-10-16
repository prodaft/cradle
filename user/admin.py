from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from file_transfer.utils import MinioClient
from .models import CradleUser


@admin.action(description="Create Minio Bucket")
def create_minio_bucket(modeladmin, request, queryset):
    for user in queryset:
        MinioClient().create_user_bucket(str(user.id))


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

    actions = [create_minio_bucket]


# Register the CradleUser model and the custom admin interface
admin.site.register(CradleUser, CradleUserAdmin)

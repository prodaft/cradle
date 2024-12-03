from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from file_transfer.utils import MinioClient
from .models import CradleUser


@admin.action(description="Create Minio Bucket")
def create_minio_bucket(modeladmin, request, queryset):
    for user in queryset:
        MinioClient().create_user_bucket(str(user.id))


@admin.action(description="Send Confirmation Email")
def send_email_confirmation(modeladmin, request, queryset):
    for user in queryset:
        user.send_email_confirmation()


class CradleUserAdmin(UserAdmin):
    model = CradleUser
    list_display = ("username", "email", "is_active", "email_confirmed", "last_login")
    list_filter = ("is_active", "email_confirmed", "is_staff", "is_superuser", "groups")
    search_fields = ("username", "email")
    ordering = ("username",)
    readonly_fields = (
        "id",
        "last_login",
        "date_joined",
        "password_reset_token_expiry",
        "email_confirmation_token_expiry",
    )

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "email_confirmed",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("API Keys", {"fields": ("vt_api_key", "catalyst_api_key")}),
        (
            "Tokens & Expiry",
            {
                "fields": (
                    "password_reset_token",
                    "password_reset_token_expiry",
                    "email_confirmation_token",
                    "email_confirmation_token_expiry",
                )
            },
        ),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

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
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                ),
            },
        ),
    )

    actions = [create_minio_bucket]


# Register the CradleUser model and the custom admin interface
admin.site.register(CradleUser, CradleUserAdmin)

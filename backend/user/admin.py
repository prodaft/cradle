"""Django admin configuration for the user app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import QuerySet
from django.http import HttpRequest

from file_transfer.s3_utils import ensure_cradle_buckets_exist

from .models import CradleUser


@admin.action(description="Ensure storage buckets exist")
def ensure_storage_buckets(modeladmin: admin.ModelAdmin, request: HttpRequest, queryset: QuerySet[CradleUser]) -> None:
    """Ensure all CRADLE S3/MinIO buckets exist (best-effort)."""
    try:
        ensure_cradle_buckets_exist()
        modeladmin.message_user(request, "Storage buckets ensured.")
    except Exception as e:
        modeladmin.message_user(request, f"Failed: {e}", level=40)


@admin.action(description="Send Confirmation Email")
def send_email_confirmation(modeladmin: admin.ModelAdmin, request: HttpRequest, queryset: QuerySet[CradleUser]) -> None:
    """Send email confirmation to each selected user. No-op for already confirmed users."""
    for user in queryset:
        user.send_email_confirmation()


class CradleUserAdmin(UserAdmin):
    """Admin for CradleUser: list/filter/search, fieldsets, and custom actions."""

    model = CradleUser
    list_display = ("username", "email", "role", "is_active", "email_confirmed", "last_login")
    list_filter = ("is_active", "email_confirmed", "is_staff", "role", "groups")
    search_fields = ("username", "email", "role")
    ordering = ("username",)
    readonly_fields = (
        "id",
        "last_login",
        "date_joined",
        "password_reset_token_expiry",
        "email_confirmation_token_expiry",
        "two_factor_enabled",
    )

    fieldsets = (
        (None, {"fields": ("id", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "email_confirmed",
                    "two_factor_enabled",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_staff",
                    "role",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("API Keys", {"fields": ("catalyst_api_key",)}),
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
                    "role",
                    "groups",
                ),
            },
        ),
    )

    actions = [ensure_storage_buckets, send_email_confirmation]


admin.site.register(CradleUser, CradleUserAdmin)

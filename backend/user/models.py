import uuid
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from access.enums import AccessType
from core.fields import BitStringField
from logs.models import LoggableModelMixin
from mail.models import ConfirmationMail, ResetPasswordMail
from management.settings import cradle_settings

from .managers import CradleUserManager


class UserRoles(models.TextChoices):
    ADMIN = "admin"  # Superuser
    MANAGER = "manager"  # Manages everything except users
    ENTRY_MANAGER = "entrymanager"  # Manage Entities and EntryTypes
    USER = "author"  # Writer of notes


DEFAULT_THEME = {
    "name": "cradle-dark",
    "--background": "#1a1a1a",
    "--foreground": "#ffffff",
    "--card": "#1f1f1f",
    "--card-foreground": "#bfbfbf",
    "--popover": "#1f1f1f",
    "--popover-foreground": "#bfbfbf",
    "--primary": "#c7772a",
    "--primary-foreground": "#ffffff",
    "--secondary": "#2a2a2a",
    "--secondary-foreground": "#bfbfbf",
    "--muted": "#2a2a2a",
    "--muted-foreground": "#999999",
    "--accent": "#2a2a2a",
    "--accent-foreground": "#ffffff",
    "--destructive": "#b85d30",
    "--destructive-foreground": "#ffffff",
    "--border": "#2a2a2a",
    "--input": "#2a2a2a",
    "--ring": "#c7772a",
    "--sidebar": "#1a1a1a",
    "--sidebar-foreground": "#999999",
    "--sidebar-primary": "#c7772a",
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": "#2a2a2a",
    "--sidebar-accent-foreground": "#ffffff",
    "--sidebar-border": "#2a2a2a",
    "--pm-header-mark-color": "#c7772a",
    "--pm-link-color": "#c7772a",
    "--pm-muted-color": "#999999",
    "--pm-code-background-color": "#1a1a1a",
    "--pm-code-btn-background-color": "#2a2a2a",
    "--pm-code-btn-hover-background-color": "#404040",
    "--pm-blockquote-vertical-line-background-color": "#2a2a2a",
    "--pm-cursor-color": "#ffffff",
}


def default_theme():
    return deepcopy(DEFAULT_THEME)


class CradleUser(AbstractUser, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email: models.EmailField = models.EmailField(unique=True)
    role: models.CharField = models.CharField(max_length=32, choices=UserRoles.choices, default=UserRoles.USER)

    api_key: Optional[str] = models.CharField(max_length=128, blank=True, null=True)

    catalyst_api_key: Optional[str] = models.TextField(null=True, blank=True)

    password_reset_token: Optional[str] = models.TextField(null=True, blank=True)
    password_reset_token_expiry: Optional[models.DateTimeField] = models.DateTimeField(null=True, blank=True)

    email_confirmed: models.BooleanField = models.BooleanField(default=False)
    email_confirmation_token: Optional[str] = models.TextField(null=True, blank=True)
    email_confirmation_token_expiry: Optional[models.DateTimeField] = models.DateTimeField(null=True, blank=True)

    is_active: models.BooleanField = models.BooleanField(default=False)

    two_factor_enabled = models.BooleanField(default=False)

    default_note_template = models.TextField(blank=True, null=True, help_text="Default template for new notes")
    vim_mode = models.BooleanField(default=False, help_text="Whether to enable Vim keybindings in the editor")

    theme = models.JSONField(default=default_theme, help_text="Theme settings to use in the UI")

    file_upload_limit_override: models.PositiveBigIntegerField = models.PositiveBigIntegerField(
        default=None, null=True, help_text="File upload limit in bytes"
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password", "email"]
    EMAIL_FIELD = "email"

    # incompatible types. We do not have a fix for this yet.
    objects: CradleUserManager = CradleUserManager()  # type: ignore

    def __str__(self):
        return self.username

    def __eq__(self, value: object) -> bool:
        if not isinstance(value, CradleUser):
            return False

        return value.pk == self.pk

    def send_email_confirmation(self):
        """Send an email confirmation to the user."""
        if self.email_confirmed:
            return

        # Generate a token and set its expiration
        self.email_confirmation_token = uuid.uuid4().hex
        self.email_confirmation_token_expiry = timezone.now() + timedelta(hours=24)
        self.save(
            update_fields=[
                "email_confirmation_token",
                "email_confirmation_token_expiry",
            ]
        )

        mail = ConfirmationMail(self)
        mail.dispatch()

    def send_password_reset(self):
        """Send a password reset email to the user."""
        # Generate a token and set its expiration
        self.password_reset_token = uuid.uuid4().hex
        self.password_reset_token_expiry = timezone.now() + timedelta(hours=1)
        self.save(update_fields=["password_reset_token", "password_reset_token_expiry"])

        mail = ResetPasswordMail(self)
        mail.dispatch()

    def __hash__(self) -> int:
        return hash(self.pk)

    def propagate_from(self, log):
        return

    def _propagate_log(self, log):
        return

    @property
    def file_upload_limit(self):
        if self.is_cradle_admin:
            return 2 ** (64)
        if self.file_upload_limit_override is None:
            return cradle_settings.files.upload_limit
        return self.file_upload_limit_override

    @property
    def is_cradle_admin(self):
        return self.role == UserRoles.ADMIN

    @property
    def is_cradle_manager(self):
        return self.role == UserRoles.MANAGER or self.is_cradle_admin

    @property
    def is_entry_manager(self):
        return self.role == UserRoles.ENTRY_MANAGER or self.is_cradle_manager

    @property
    def access_vector(self):
        if self.is_cradle_admin:
            return "1" * 2048
        acvec = 1

        for access in self.accesses.all():
            if access.access_type == AccessType.NONE:
                continue
            acvec |= 1 << access.entity.acvec_offset

        fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)

        return fieldtype.get_prep_value(acvec)

    @property
    def access_vector_inv(self):
        if self.is_cradle_admin:
            return "0" * 2048
        acvec = 1

        for access in self.accesses.all():
            if access.access_type == AccessType.NONE:
                continue
            acvec |= 1 << access.entity.acvec_offset

        fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)

        inverter = 1
        for i in range(2048):
            inverter |= 1 << i

        return fieldtype.get_prep_value(acvec ^ inverter)

    def enable_2fa(self):
        """
        Enable 2FA for the user and return the secret key.

        Uses database transactions and select_for_update to prevent race conditions
        when multiple requests are sent simultaneously. This ensures only one
        device is created per user regardless of concurrent requests.
        """
        from django.db import transaction

        if not self.two_factor_enabled:
            with transaction.atomic():
                devices = TOTPDevice.objects.select_for_update().filter(user=self)

                if devices.exists():
                    device = devices.order_by("-id").first()

                    if not device.confirmed:
                        devices.exclude(id=device.id).filter(confirmed=False).delete()
                        return device.config_url
                    else:
                        devices.delete()

                device = TOTPDevice.objects.create(
                    user=self,
                    name=f"Default device for {self.username}",
                    confirmed=False,
                )
                return device.config_url
        return None

    def verify_2fa_token(self, token):
        """Verify a 2FA token."""
        from django.db import transaction

        with transaction.atomic():
            unconfirmed_devices = TOTPDevice.objects.select_for_update().filter(user=self, confirmed=False)

            for device in unconfirmed_devices:
                if device.verify_token(token):
                    device.confirmed = True
                    device.save()

                    unconfirmed_devices.exclude(id=device.id).delete()
                    return True

            for device in TOTPDevice.objects.filter(user=self, confirmed=True):
                if device.verify_token(token):
                    return True

        return False

    def disable_2fa(self):
        """Disable 2FA for the user."""
        from django.db import transaction

        # Use a transaction to ensure atomicity
        with transaction.atomic():
            # Delete all TOTP devices for this user
            TOTPDevice.objects.filter(user=self).delete()
            self.two_factor_enabled = False
            self.save(update_fields=["two_factor_enabled"])


class ExternalIdentity(models.Model):
    """Links a Cradle user to an external OAuth/OIDC identity."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user: models.ForeignKey = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="external_identities",
    )
    provider: models.CharField = models.CharField(max_length=64)
    subject: models.CharField = models.CharField(max_length=255)
    issuer: Optional[str] = models.CharField(max_length=255, blank=True, null=True)
    email: Optional[str] = models.EmailField(blank=True, null=True)
    email_verified: models.BooleanField = models.BooleanField(default=False)
    display_name: Optional[str] = models.CharField(max_length=255, blank=True, null=True)
    raw_claims: Optional[dict] = models.JSONField(blank=True, null=True)
    last_login_at: Optional[datetime] = models.DateTimeField(blank=True, null=True)
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["provider", "subject", "issuer"]),
            models.Index(fields=["user"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "subject", "issuer"],
                name="unique_external_identity",
            ),
        ]

    def __str__(self):
        issuer_part = f"@{self.issuer}" if self.issuer else ""
        return f"{self.provider}:{self.subject}{issuer_part}"


class UserSession(models.Model):
    """Track active user sessions based on refresh tokens."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user: models.ForeignKey = models.ForeignKey(CradleUser, on_delete=models.CASCADE, related_name="sessions")
    refresh_token_jti: models.CharField = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="JWT ID of the refresh token",
    )
    device_info: Optional[str] = models.CharField(
        max_length=255, blank=True, null=True, help_text="Device/browser information"
    )
    ip_address: Optional[str] = models.CharField(
        max_length=45, blank=True, null=True, help_text="IP address of the session"
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When the session was created")
    last_activity: models.DateTimeField = models.DateTimeField(auto_now=True, help_text="Last activity timestamp")
    expires_at: models.DateTimeField = models.DateTimeField(help_text="When the refresh token expires")
    is_current: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether this is the current session"
    )

    class Meta:
        ordering = ["-last_activity"]
        indexes = [
            models.Index(fields=["user", "-last_activity"]),
            models.Index(fields=["refresh_token_jti"]),
        ]

    def __str__(self):
        return f"Session for {self.user.username} - {self.device_info or 'Unknown device'}"

    def is_expired(self):
        """Check if the session has expired."""
        return timezone.now() > self.expires_at


class BlacklistedToken(models.Model):
    """Track blacklisted refresh tokens to prevent their use after revocation."""

    jti: models.CharField = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="JWT ID of the blacklisted token",
    )
    blacklisted_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the token was blacklisted"
    )
    expires_at: models.DateTimeField = models.DateTimeField(help_text="When the token expires (for cleanup purposes)")

    class Meta:
        ordering = ["-blacklisted_at"]
        indexes = [
            models.Index(fields=["jti"]),
        ]

    def __str__(self):
        return f"Blacklisted token {self.jti}"

    @classmethod
    def is_blacklisted(cls, jti: str) -> bool:
        """Check if a token JTI is blacklisted."""
        return cls.objects.filter(jti=jti).exists()

    @classmethod
    def blacklist_token(cls, jti: str, expires_at: datetime):
        """Add a token JTI to the blacklist."""
        cls.objects.get_or_create(
            jti=jti,
            defaults={"expires_at": expires_at},
        )

    @classmethod
    def cleanup_expired(cls):
        """Remove expired blacklisted tokens."""
        cls.objects.filter(expires_at__lt=timezone.now()).delete()

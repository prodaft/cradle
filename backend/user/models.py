"""User models: CradleUser, ExternalIdentity, UserSession, BlacklistedToken."""

import secrets
import uuid
from copy import deepcopy
from datetime import datetime, timedelta

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

from .constants import USER_ACCESS_VECTOR_LENGTH, USER_DEFAULT_THEME
from .managers import CradleUserManager

_ACCESS_VECTOR_FIELD = BitStringField(max_length=USER_ACCESS_VECTOR_LENGTH, null=False, default=1, varying=False)


class UserRoles(models.TextChoices):
    """User role levels for access control."""

    ADMIN = "admin"  # Superuser
    MANAGER = "manager"  # Manages everything except users
    ENTRY_MANAGER = "entrymanager"  # Manage Entities and EntryTypes
    USER = "author"  # Writer of notes


def default_theme():
    """Return a mutable copy of the default theme."""
    return deepcopy(USER_DEFAULT_THEME)


class CradleUser(AbstractUser, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email: models.EmailField = models.EmailField(unique=True, help_text="User email address (used for login)")
    role: models.CharField = models.CharField(
        max_length=32, choices=UserRoles.choices, default=UserRoles.USER, help_text="User role for access control"
    )

    api_key: models.CharField = models.CharField(
        max_length=128, blank=True, null=True, help_text="API key for programmatic access"
    )

    catalyst_api_key: models.TextField = models.TextField(
        null=True, blank=True, help_text="API key for Catalyst integration"
    )

    password_reset_token: models.TextField = models.TextField(
        null=True, blank=True, help_text="Token for password reset flow"
    )
    password_reset_token_expiry: models.DateTimeField = models.DateTimeField(
        null=True, blank=True, help_text="When the password reset token expires"
    )

    email_confirmed: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether the email address has been verified"
    )
    email_confirmation_token: models.TextField = models.TextField(
        null=True, blank=True, help_text="Token for email confirmation"
    )
    email_confirmation_token_expiry: models.DateTimeField = models.DateTimeField(
        null=True, blank=True, help_text="When the email confirmation token expires"
    )

    is_active: models.BooleanField = models.BooleanField(default=False, help_text="Whether the user can log in")

    two_factor_enabled: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether 2FA is enabled for this account"
    )

    default_note_template: models.TextField = models.TextField(
        blank=True, null=True, help_text="Default template for new notes"
    )
    vim_mode: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether to enable Vim keybindings in the editor"
    )

    theme: models.JSONField = models.JSONField(default=default_theme, help_text="Theme settings to use in the UI")

    file_upload_limit_override: models.PositiveBigIntegerField = models.PositiveBigIntegerField(
        null=True, help_text="File upload limit in bytes"
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password", "email"]
    EMAIL_FIELD = "email"

    # incompatible types. We do not have a fix for this yet.
    objects: CradleUserManager = CradleUserManager()  # type: ignore

    def __str__(self) -> str:
        """Return the username."""
        return self.username

    def __eq__(self, value: object) -> bool:
        """Compare users by primary key; return False for non-CradleUser."""
        if not isinstance(value, CradleUser):
            return False

        return value.pk == self.pk

    def send_email_confirmation(self) -> None:
        """Generate token, save, and send confirmation email. No-op if already confirmed."""
        if self.email_confirmed:
            return

        self.email_confirmation_token = secrets.token_hex(32)
        self.email_confirmation_token_expiry = timezone.now() + timedelta(hours=24)
        self.save(
            update_fields=[
                "email_confirmation_token",
                "email_confirmation_token_expiry",
            ]
        )

        mail = ConfirmationMail(self)
        mail.dispatch()

    def send_password_reset(self) -> None:
        """Generate token, save, and send password reset email."""
        self.password_reset_token = secrets.token_hex(32)
        self.password_reset_token_expiry = timezone.now() + timedelta(hours=1)
        self.save(update_fields=["password_reset_token", "password_reset_token_expiry"])

        mail = ResetPasswordMail(self)
        mail.dispatch()

    def __hash__(self) -> int:
        """Hash by primary key for use in sets/dicts."""
        return hash(self.pk)

    def propagate_from(self, log) -> None:
        """No-op: User has no linked loggables to propagate to."""
        return

    def _propagate_log(self, log) -> None:
        """No-op: User has no linked loggables to propagate to."""
        return

    @property
    def file_upload_limit(self) -> int:
        """Max upload size in bytes (admin unlimited, else override or global default)."""
        if self.is_cradle_admin:
            return 2**64  # Sentinel for unlimited
        if self.file_upload_limit_override is None:
            return cradle_settings.files.upload_limit
        return self.file_upload_limit_override

    @property
    def is_cradle_admin(self) -> bool:
        """True if user has admin role."""
        return self.role == UserRoles.ADMIN

    def _compute_access_bitmask(self) -> int:
        """Compute the access bitmask from user's entity accesses."""
        acvec = 1
        for access in self.accesses.all():
            if access.access_type == AccessType.NONE or access.entity is None:
                continue
            acvec |= 1 << access.entity.acvec_offset
        return acvec

    @property
    def access_vector(self) -> str:
        """Bitstring of entity access permissions (all 1s for admin)."""
        if self.is_cradle_admin:
            return "1" * USER_ACCESS_VECTOR_LENGTH
        return _ACCESS_VECTOR_FIELD.get_prep_value(self._compute_access_bitmask())

    @property
    def access_vector_inv(self) -> str:
        """Inverted access vector for exclusion queries."""
        if self.is_cradle_admin:
            return "0" * USER_ACCESS_VECTOR_LENGTH
            inverter = (1 << USER_ACCESS_VECTOR_LENGTH) - 1
        return _ACCESS_VECTOR_FIELD.get_prep_value(self._compute_access_bitmask() ^ inverter)

    def enable_2fa(self) -> str | None:
        """Enable 2FA for the user and return the config URL for the TOTP device.

        Uses database transactions and select_for_update to prevent race conditions
        when multiple requests are sent simultaneously. Returns None if 2FA is
        already enabled.
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

    def disable_2fa(self) -> None:
        """Disable 2FA and remove all TOTP devices for the user."""
        from django.db import transaction

        with transaction.atomic():
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
        help_text="Cradle user this identity is linked to",
    )
    provider: models.CharField = models.CharField(
        max_length=64, help_text="OAuth/OIDC provider name (e.g. google, github)"
    )
    subject: models.CharField = models.CharField(max_length=255, help_text="Provider's unique identifier for this user")
    issuer: models.CharField = models.CharField(
        max_length=255, blank=True, null=True, help_text="OIDC issuer URL when applicable"
    )
    email: models.EmailField = models.EmailField(blank=True, null=True, help_text="Email from the identity provider")
    email_verified: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether the provider verified this email"
    )
    display_name: models.CharField = models.CharField(
        max_length=255, blank=True, null=True, help_text="Display name from the provider"
    )
    raw_claims: models.JSONField = models.JSONField(
        blank=True, null=True, help_text="Raw OAuth/OIDC claims from the provider"
    )
    last_login_at: models.DateTimeField = models.DateTimeField(
        blank=True, null=True, help_text="Last login via this identity"
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When the identity was linked")
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True, help_text="Last update timestamp")

    class Meta:
        indexes = [
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
    user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, related_name="sessions", help_text="User this session belongs to"
    )
    refresh_token_jti: models.CharField = models.CharField(
        max_length=255,
        unique=True,
        help_text="JWT ID of the refresh token",
    )
    device_info: models.CharField = models.CharField(
        max_length=255, blank=True, null=True, help_text="Device/browser information"
    )
    ip_address: models.CharField = models.CharField(
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
        ]

    def __str__(self) -> str:
        """Return session description with user and device."""
        return f"Session for {self.user.username} - {self.device_info or 'Unknown device'}"

    def is_expired(self) -> bool:
        """Return True if the session has expired."""
        return timezone.now() > self.expires_at


class BlacklistedToken(models.Model):
    """Track blacklisted refresh tokens to prevent their use after revocation."""

    jti: models.CharField = models.CharField(
        max_length=255,
        unique=True,
        help_text="JWT ID of the blacklisted token",
    )
    blacklisted_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the token was blacklisted"
    )
    expires_at: models.DateTimeField = models.DateTimeField(help_text="When the token expires (for cleanup purposes)")

    class Meta:
        ordering = ["-blacklisted_at"]

    def __str__(self) -> str:
        """Return blacklisted token identifier."""
        return f"Blacklisted token {self.jti}"

    @classmethod
    def is_blacklisted(cls, jti: str) -> bool:
        """Check if a token JTI is blacklisted."""
        return cls.objects.filter(jti=jti).exists()

    @classmethod
    def blacklist_token(cls, jti: str, expires_at: datetime) -> None:
        """Add a token JTI to the blacklist (idempotent via get_or_create)."""
        cls.objects.get_or_create(
            jti=jti,
            defaults={"expires_at": expires_at},
        )

import uuid
from datetime import datetime, timedelta
from typing import Optional

from django.contrib.auth.models import AbstractUser
from django.db import models
from django_otp.plugins.otp_totp.models import TOTPDevice

from access.enums import AccessType
from logs.models import LoggableModelMixin
from mail.models import ConfirmationMail, ResetPasswordMail

from .managers import CradleUserManager
from core.fields import BitStringField


class UserRoles(models.TextChoices):
    ADMIN = "admin"  # Superuser
    MANAGER = "manager"  # Manages everything except users
    ENTRY_MANAGER = "entrymanager"  # Manage Entities and EntryTypes
    USER = "author"  # Writer of notes


class Theme(models.TextChoices):
    DARK = "dark"
    LIGHT = "light"


class CradleUser(AbstractUser, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    email: models.EmailField = models.EmailField(unique=True)
    role: models.CharField = models.CharField(
        max_length=32, choices=UserRoles.choices, default=UserRoles.USER
    )

    api_key: Optional[str] = models.CharField(max_length=128, blank=True, null=True)

    vt_api_key: Optional[str] = models.TextField(null=True, blank=True)
    catalyst_api_key: Optional[str] = models.TextField(null=True, blank=True)

    password_reset_token: Optional[str] = models.TextField(null=True, blank=True)
    password_reset_token_expiry: Optional[models.DateTimeField] = models.DateTimeField(
        null=True, blank=True
    )

    email_confirmed: models.BooleanField = models.BooleanField(default=False)
    email_confirmation_token: Optional[str] = models.TextField(null=True, blank=True)
    email_confirmation_token_expiry: Optional[models.DateTimeField] = (
        models.DateTimeField(null=True, blank=True)
    )

    is_active: models.BooleanField = models.BooleanField(default=False)

    two_factor_enabled = models.BooleanField(default=False)

    default_note_template = models.TextField(
        blank=True, null=True, help_text="Default template for new notes"
    )
    vim_mode = models.BooleanField(
        default=False, help_text="Whether to enable Vim keybindings in the editor"
    )

    theme = models.CharField(
        default=Theme.DARK, choices=Theme.choices, help_text="Theme to use in the UI"
    )
    compact_mode = models.BooleanField(
        default=False, help_text="Whether to use compact mode in the UI"
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
        self.email_confirmation_token_expiry = datetime.now() + timedelta(hours=24)
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
        self.password_reset_token_expiry = datetime.now() + timedelta(hours=1)
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

        fieldtype = BitStringField(
            max_length=2048, null=False, default=1, varying=False
        )

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

        fieldtype = BitStringField(
            max_length=2048, null=False, default=1, varying=False
        )

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
            unconfirmed_devices = TOTPDevice.objects.select_for_update().filter(
                user=self, confirmed=False
            )

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

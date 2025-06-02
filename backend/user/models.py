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
        """Enable 2FA for the user and return the secret key."""
        if not self.two_factor_enabled:
            device = TOTPDevice.objects.create(
                user=self, name=f"Default device for {self.username}", confirmed=False
            )
            return device.config_url
        return None

    def verify_2fa_token(self, token):
        """Verify a 2FA token."""
        device = TOTPDevice.objects.filter(user=self).first()
        if device and device.verify_token(token):
            if not device.confirmed:
                device.confirmed = True
                device.save()
            return True
        return False

    def disable_2fa(self):
        """Disable 2FA for the user."""
        TOTPDevice.objects.filter(user=self).delete()
        self.two_factor_enabled = False
        self.save()

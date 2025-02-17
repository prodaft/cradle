import uuid
from datetime import datetime, timedelta
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.mail import send_mail
from django.db import models

from logs.models import LoggableModelMixin
from mail.models import ConfirmationMail, ResetPasswordMail

from .managers import CradleUserManager


class UserRoles(models.TextChoices):
    ADMIN = "admin"  # Superuser
    MANAGER = "entrymanager"  # Manage Entities and EntryTypes
    USER = "author"  # Writer of notes


class CradleUser(AbstractUser, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    email: models.EmailField = models.EmailField(unique=True)
    role: models.CharField = models.CharField(
        max_length=32, choices=UserRoles.choices, default=UserRoles.USER
    )

    vt_api_key: Optional[str] = models.TextField(null=True, blank=True)
    catalyst_api_key: Optional[str] = models.TextField(null=True, blank=True)

    password_reset_token: Optional[str] = models.TextField(null=True, blank=True)
    password_reset_token_expiry: Optional[models.DateTimeField] = models.DateTimeField(
        null=True, blank=True
    )

    email_confirmed: models.BooleanField = models.BooleanField(
        default=(not settings.REQUIRE_EMAIL_CONFIRMATION)
    )
    email_confirmation_token: Optional[str] = models.TextField(null=True, blank=True)
    email_confirmation_token_expiry: Optional[models.DateTimeField] = (
        models.DateTimeField(null=True, blank=True)
    )

    is_active: models.BooleanField = models.BooleanField(
        default=(not settings.REQUIRE_ADMIN_ACTIVATION)
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

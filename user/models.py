from django.contrib.auth.models import AbstractUser

from logs.models import LoggableModelMixin
from .managers import CradleUserManager
from django.core.mail import send_mail
from django.conf import settings
from django.db import models
import uuid

from django.utils.timezone import now, timedelta


class CradleUser(AbstractUser, LoggableModelMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    vt_api_key = models.TextField(null=True, blank=True)
    catalyst_api_key = models.TextField(null=True, blank=True)

    password_reset_token = models.TextField(null=True, blank=True)
    password_reset_token_expiry = models.DateTimeField(null=True, blank=True)

    email_confirmed = models.BooleanField(
        default=(not settings.REQUIRE_EMAIL_CONFIRMATION)
    )
    email_confirmation_token = models.TextField(null=True, blank=True)
    email_confirmation_token_expiry = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=(not settings.REQUIRE_ADMIN_ACTIVATION))

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
        self.email_confirmation_token_expiry = now() + timedelta(hours=24)
        self.save(
            update_fields=[
                "email_confirmation_token",
                "email_confirmation_token_expiry",
            ]
        )

        # Construct email content
        confirmation_url = f"{settings.FRONTEND_URL}/#confirm-email?token={self.email_confirmation_token}"
        subject = "CRADLE Email Confirmation"
        message = (
            f"Hey {self.username}!\nPlease confirm your email"
            + f"by visiting the following link: {confirmation_url}"
        )
        from_email = settings.DEFAULT_FROM_EMAIL

        # Send email
        send_mail(subject, message, from_email, [self.email])

    def send_password_reset(self):
        """Send a password reset email to the user."""
        # Generate a token and set its expiration
        self.password_reset_token = uuid.uuid4().hex
        self.password_reset_token_expiry = now() + timedelta(hours=1)
        self.save(update_fields=["password_reset_token", "password_reset_token_expiry"])

        # Construct email content
        reset_url = f"{settings.FRONTEND_URL}/#change-password?token={self.password_reset_token}"
        subject = "CRADLE Password Reset"
        message = (
            f"Hey {self.username}!\nYou can reset your password using the "
            + f"following link: {reset_url}\nThis link will expire in 1 hour."
        )
        from_email = settings.DEFAULT_FROM_EMAIL

        # Send email
        send_mail(subject, message, from_email, [self.email])

    def __hash__(self) -> int:
        return hash(self.pk)

    def propagate_from(self, log):
        return

    def _propagate_log(self, log):
        return

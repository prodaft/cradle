"""CradleUser manager with create_user, create_superuser, and active queryset; UserSession queryset."""

import hashlib

from django.apps import apps
from django.contrib.auth.base_user import BaseUserManager
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from management.settings import cradle_settings

from .utils.tokens import token_expires_at


def hash_api_key(key: str) -> str:
    """Return the stored form of an API key: its SHA-256 hex digest.

    Keys are 192 random bits, so a plain SHA-256 digest is safe to store and lets one indexed lookup
    replace a bcrypt check per key holder (which made every bogus key cost a full scan).
    """
    return hashlib.sha256(key.encode()).hexdigest()


class CradleUserQuerySet(models.QuerySet):
    def active(self):
        """Return only active users."""
        return self.filter(is_active=True)

    def with_api_key(self, key: str):
        """Return users whose API key is ``key`` (the raw key a client sends)."""
        return self.filter(api_key=hash_api_key(key))

    def admins(self):
        """Return users with the admin role."""
        from .models import UserRoles

        return self.filter(role=UserRoles.ADMIN)

    def non_admins(self):
        """Return users without the admin role."""
        from .models import UserRoles

        return self.exclude(role=UserRoles.ADMIN)

    def managers(self):
        """Return users who manage entities: managers and admins (see ``CradleUser.is_manager``)."""
        from .models import UserRoles

        return self.filter(role__in=(UserRoles.ADMIN, UserRoles.MANAGER))


class CradleUserManager(BaseUserManager.from_queryset(CradleUserQuerySet)):  # type: ignore[misc]
    def create_user(self, username, password, email, **extra_fields):
        """Create a user with given username, password and email.

        Args:
            username: The username of the user.
            password: The password of the user.
            email: The email of the user.
            extra_fields: Additional fields which can be added.

        Returns:
            A CradleUser instance with the specified username, password,
            email and additional arguments.

        Raises:
            ValueError: If the username, password or email are not specified.
        """
        if not username or not password or not email:
            raise ValueError(_("Username, password and email must all be set."))

        user = self.model(
            username=username,
            email=email,
            is_active=extra_fields.pop("is_active", not cradle_settings.users.require_admin_confirmation),
            email_confirmed=extra_fields.pop("email_confirmed", not cradle_settings.users.require_email_confirmation),
            **extra_fields,
        )
        user.set_password(password)

        with transaction.atomic():
            user.save(using=self._db)
        return user

    def create_superuser(self, username, password, email, **extra_fields):
        """Create a superuser with given username, password and email.

        Args:
            username: The username of the user.
            password: The password of the user.
            email: The email of the user.
            extra_fields: Additional fields which can be added.

        Returns:
            A CradleUser instance with superuser privileges and the specified
            username, password and additional arguments.

        Raises:
            ValueError: If the username, password or email are not specified or
            the extra_fields do not ensure superuser privileges.
        """
        from .models import UserRoles

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("role", UserRoles.ADMIN)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("email_confirmed", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(username, password, email, **extra_fields)


class UserSessionQuerySet(models.QuerySet):
    def active(self):
        """Return sessions that have not expired (revoked sessions are deleted)."""
        return self.filter(expires_at__gt=timezone.now())

    def record(self, user, refresh_token, *, device_info: str | None = None, ip_address: str | None = None) -> None:
        """Create the session for a new token pair, or move an existing one to its rotated refresh token.

        Sessions are keyed by the tokens' ``sid`` claim, which survives rotation, so refreshing updates the row
        in place.
        """
        self.update_or_create(
            id=refresh_token["sid"],
            defaults={
                "refresh_token_jti": refresh_token["jti"],
                "user": user,
                "device_info": device_info,
                "ip_address": ip_address,
                "expires_at": token_expires_at(refresh_token),
            },
        )

    def revoke(self) -> int:
        """End these sessions: blacklist their refresh tokens and delete the rows; return how many were ended.

        Deleting a row also stops its access tokens and closes its WebSockets (see ``user.signals``).
        """
        BlacklistedToken = apps.get_model("user", "BlacklistedToken")
        sessions = list(self.values_list("refresh_token_jti", "expires_at"))
        for jti, expires_at in sessions:
            BlacklistedToken.blacklist_token(jti, expires_at)
        self.delete()
        return len(sessions)

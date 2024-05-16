from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _

from entities.models import Case
from .models import Access, AccessType

class CradleUserManager(BaseUserManager):

    def create_user(self, username, password, **extra_fields):
        """Create a user with given username and password

        Args:
            username: The username of the user.
            password: The password of the user.
            extra_fields: Additional fields which can be added

        Returns:
            A CradleUser instance with the specified username, password and
            additional arguments.

        Raises:
            ValueError: if the username or password are not specified.
        """
        if not username or not password:
            raise ValueError(_("Both username and password must be set"))

        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, username, password, **extra_fields):
        """Create a user with given username and password

        Args:
            username: The username of the user.
            password: The password of the user.
            extra_fields: Additional fields which can be added

        Returns:
            A CradleUser instance with superuser privileges and the specified
            username, password and additional arguments.

        Raises:
            ValueError: If the username or password are not specified or the
                the extra_fields do not ensure superuser privileges.
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(username, password, **extra_fields)

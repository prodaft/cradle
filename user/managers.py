from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
from file_transfer.utils import MinioClient
from django.db import transaction


class CradleUserManager(BaseUserManager):

    def create_user(self, username, password, email, **extra_fields):
        """Create a user with given username and password. Additionally,
        create a bucket on the Minio instance for that specific user.

        Args:
            username: The username of the user.
            password: The password of the user.
            email: The email of the user
            extra_fields: Additional fields which can be added

        Returns:
            A CradleUser instance with the specified username, password,
            email and additional arguments.

        Raises:
            ValueError: if the username, password or email are not specified.
        """
        if not username or not password:
            raise ValueError(_("Username, password and email must all be set."))

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)

        with transaction.atomic():
            user.save(using=self._db)
            MinioClient().create_user_bucket(user.username)

        return user

    def create_superuser(self, username, password, email, **extra_fields):
        """Create a user with given username, password and email.

        Args:
            username: The username of the user.
            password: The password of the user.
            email: The email of the user.
            extra_fields: Additional fields which can be added

        Returns:
            A CradleUser instance with superuser privileges and the specified
            username, password and additional arguments.

        Raises:
            ValueError: If the username, password or email are not specified or
            the extra_fields do not ensure superuser privileges.
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(username, password, email, **extra_fields)

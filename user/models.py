from django.contrib.auth.models import AbstractUser
from .managers import CradleUserManager


class CradleUser(AbstractUser):

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password"]
    # incompatible types. We do not have a fix for this yet.
    objects: CradleUserManager = CradleUserManager()  # type: ignore

    def __str__(self):
        return self.username

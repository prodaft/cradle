from django.contrib.auth.models import AbstractUser
from .managers import CradleUserManager
from django.db import models


class CradleUser(AbstractUser):
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password"]
    EMAIL_FIELD = "email"
    # incompatible types. We do not have a fix for this yet.
    objects: CradleUserManager = CradleUserManager()  # type: ignore

    def __str__(self):
        return self.username

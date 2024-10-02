from django.contrib.auth.models import AbstractUser
from .managers import CradleUserManager
from django.db import models
import uuid


class CradleUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password", "email"]
    EMAIL_FIELD = "email"
    # incompatible types. We do not have a fix for this yet.
    objects: CradleUserManager = CradleUserManager()  # type: ignore

    def __str__(self):
        return self.username

    def __eq__(self, value: object) -> bool:
        if not isinstance(object, CradleUser):
            return False

        return value.pk == self.pk

from django.contrib.auth.models import AbstractUser
from ..managers.cradle_user_manager import CradleUserManager


class CradleUser(AbstractUser):

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password"]

    objects = CradleUserManager()

    def __str__(self):
        return self.username

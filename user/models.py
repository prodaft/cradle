from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

from entities.models import Case

from .managers import CradleUserManager


class AccessType(models.TextChoices):

    NONE = "none", _("No access")
    READ = "read", _("Read access")
    READ_WRITE = "read-write", _("Read-write access")


class CradleUser(AbstractUser):

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["password"]

    objects = CradleUserManager()

    def __str__(self):
        return self.username


class Access(models.Model):

    user = models.ForeignKey(CradleUser, on_delete=models.CASCADE)
    case = models.ForeignKey(Case, on_delete=models.CASCADE)
    access_type = models.CharField(max_length=20, choices=AccessType.choices)

    def __str__(self):
        return str(self.case) + " " + self.access_type

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "case"], name="unique_user_id_case_id"
            )
        ]

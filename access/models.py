from django.db import models
from entries.models import Entry
from .managers import AccessManager
from .enums import AccessType
from user.models import CradleUser
import uuid


class Access(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, to_field="id"
    )
    case: models.ForeignKey = models.ForeignKey(
        Entry, on_delete=models.CASCADE, to_field="id", null=True
    )
    access_type: models.CharField = models.CharField(
        max_length=20, choices=AccessType.choices, default=AccessType.NONE
    )

    objects = AccessManager()

    def __str__(self):
        return str(self.case) + " " + self.access_type

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "case"], name="unique_user_id_case_id"
            )
        ]

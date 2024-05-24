from django.db import models
from entities.models import Entity
from ..managers.access_manager import AccessManager
from ..enums import AccessType
from .cradle_user_model import CradleUser


class Access(models.Model):

    user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, to_field="id"
    )
    case: models.ForeignKey = models.ForeignKey(
        Entity, on_delete=models.CASCADE, to_field="id", null=True
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

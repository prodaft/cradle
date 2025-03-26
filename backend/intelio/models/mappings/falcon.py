from django.db import models
from ..base import ClassMapping


class FalconMapping(ClassMapping):
    """
    A mapping for Catalyst types.
    """

    display_name = "falcon"

    type = models.CharField(max_length=255, unique=True)

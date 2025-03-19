from django.db import models
from .base import ClassMapping


class CatalystMapping(ClassMapping):
    """
    A mapping for Catalyst types.
    """

    display_name = "catalyst"

    type = models.CharField(max_length=255)
    subtype = models.CharField(max_length=255)
    level = models.CharField(max_length=255)
    model_class = models.CharField(max_length=255)

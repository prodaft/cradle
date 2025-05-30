from django.db import models
from ..base import ClassMapping


class CatalystMapping(ClassMapping):
    """
    A mapping for Catalyst types.
    """

    display_name = "catalyst"

    type = models.CharField(max_length=255)
    field = models.CharField(max_length=255)
    level = models.CharField(max_length=255)
    link_type = models.CharField(max_length=255)
    extras = models.CharField(max_length=255, blank=True, null=True)

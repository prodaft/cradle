from django.db import models
from collections import defaultdict
from ..base import ClassMapping


class FalconMapping(ClassMapping):
    """
    A mapping for Catalyst types.
    """

    display_name = "falcon"

    type = models.CharField(max_length=255, unique=True)

    @classmethod
    def get_typemapping_rev(cls):
        """
        Returns a dictionary mapping type names to FalconMapping instances.
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.type] = mapping.internal_class

        return typemapping

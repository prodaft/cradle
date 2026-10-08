from collections import defaultdict

from django.db import models

from ..base import ClassMapping


class FalconMapping(ClassMapping):
    """Maps Falcon entity/artifact types to CRADLE entry classes. Used by FalconDigest."""

    display_name = "falcon"
    type = models.CharField(max_length=255, unique=True, help_text="Falcon type identifier")

    @classmethod
    def get_typemapping_rev(cls):
        """Returns a dictionary mapping type names to FalconMapping instances."""
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.type] = mapping.internal_class

        return typemapping

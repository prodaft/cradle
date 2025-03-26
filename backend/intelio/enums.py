from django.db import models


from django.utils.translation import gettext_lazy as _


class EnrichmentStrategy(models.TextChoices):
    MANUAL = "manual", _("Manual")
    ON_CREATE = "on_create", _("On Create")


#    PERIODIC = "periodic", _("Periodic")


class AssociationReason(models.TextChoices):
    CONTAINS = "contains", _("Contains")
    ALIAS = "alias", _("Alias")
    ENCOUNTER = "encounter", _("Encounter")


class DigestStatus(models.TextChoices):
    WORKING = "working", "Working"
    DONE = "done", "Done"
    ERROR = "error", "Error"

from django.db import models
from django.utils.translation import gettext_lazy as _
from typing import Type, cast
from django.db.models.enums import ChoicesMeta


class EntryType(models.TextChoices):

    ACTOR = "actor", _("Actor")
    CASE = "case", _("Case")
    ARTIFACT = "artifact", _("Artifact")
    METADATA = "metadata", _("Metadata")


class ArtifactSubtype(models.TextChoices):
    IP = "ip", _("IP Address")
    DOMAIN = "domain", _("Domain Name")
    URL = "url", _("URL")
    USERNAME = "username", _("Username")
    PASSWORD = "password", _("Password")
    SOCIAL_MEDIA = "social", _("Social Media")
    HASH = "hash", _("Hash")
    TOOL = "tool", _("Tool Name")
    CVE = "cve", _("CVE")
    TTP = "ttp", _("TTP")
    MALWARE = "malware", _("Malware")
    CAMPAIGN = "campaign", _("Campaign")
    FAMILY = "family", _("Family")


class MetadataSubtype(models.TextChoices):
    CRIME = "crime", _("Crime Type")
    INDUSTRY = "industry", _("Industry")
    COUNTRY = "country", _("Country")
    COMPANY = "company", _("Company")


def concatenate_enums(enum1: Type[models.TextChoices], enum2: Type[models.TextChoices]):
    """Creates a dictionary containing the concatenation of the
    choices of two models.TextChoices.

    Args:
        enum1 (Type[models.TextChoices]): The first enum
        enum2 (Type[models.TextChoices]): The second enum

    Returns:
        Dict[str, Dict[str, str]]: Dictionary containing
        the concatenation of the choices of two TextChoices
    """
    combined = {}
    for artifact in enum1:
        combined[artifact.name] = artifact.value, artifact.label
    for artifact in enum2:
        combined[artifact.name] = artifact.value, artifact.label
    return combined


EntrySubtype: ChoicesMeta = cast(
    ChoicesMeta,
    models.TextChoices(
        "EntrySubtype", concatenate_enums(ArtifactSubtype, MetadataSubtype)
    ),
)

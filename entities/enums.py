from django.db import models
from django.utils.translation import gettext_lazy as _


class EntityType(models.TextChoices):

    ACTOR = "actor", _("Actor")
    CASE = "case", _("Case")
    ENTRY = "entry", _("Entry")
    METADATA = "metadata", _("Metadata")


class EntitySubtype(models.TextChoices):

    # Entry subtypes
    IP = "ip", _("IP Address")
    DOMAIN = "domain", _("Domain Name")
    URL = "url", _("URL")
    USERNAME = "username", _("Username")
    PASSWORD = "password", _("Password")
    PERSON = "person", _("Person")
    SOCIAL_MEDIA = "social-media", _("Social Media")
    HASH = "hash", _("Hash")
    TOOL = "tool", _("Tool Name")
    CVE = "cve", _("CVE")
    TTP = "ttp", _("TTP")

    # Metdata subtypes
    CRIME = "crime", _("Crime Type")
    INDUSTRY = "industry", _("Industry")
    COUNTRY = "country", _("Country")
    COMPANY = "company", _("Company")

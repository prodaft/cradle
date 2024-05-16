from django.db import models
from django.utils.translation import gettext_lazy as _


class EntityType(models.TextChoices):

    ACTOR = "actor", _("Actor")
    CASE = "case", _("Case")
    ENTRY = "entry", _("Entry")
    METADATA = "metadata", _("Metadata")


class EntitySubtype(models.TextChoices):

    IPV4 = "ip_v4", _("IP V4")
    IPV6 = "ip_v6", _("IP V6")
    DOMAIN_NAME = "domain_name", _("Domain Name")
    URL = "url", _("URL")
    HASH = "hash", _("Hash")
    TOOL_NAME = "tool_name", _("Tool Name")
    USERNAME = "username", _("Username")
    PASSWORD = "password", _("Password")
    VULNERABILITY = "vulnerability", _("Vulnerability CVE")
    TTP = "ttp", _("TTP")
    COUNTRY = "country", _("Country")
    SECTOR = "sector", _("Sector")
    CRIME_TYPE = "crime_type", _("Crime Type")

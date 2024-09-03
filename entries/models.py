from django.db import models

from .managers import (
    EntityManager,
    ArtifactManager,
    EntryManager,
)

from .exceptions import (
    InvalidClassFormatException,
    InvalidEntryException,
    InvalidRegexException,
)
from .enums import EntryType
import uuid
import re


class EntryClass(models.Model):
    type: models.CharField = models.CharField(max_length=20, choices=EntryType.choices)
    subtype: models.CharField = models.CharField(
        max_length=20, blank=False, primary_key=True
    )
    regex: models.CharField = models.CharField(max_length=65536, blank=True, default="")
    options: models.CharField = models.CharField(
        max_length=65536, blank=True, default=""
    )

    @classmethod
    def get_default_pk(cls):
        eclass, created = cls.objects.get_or_create(
            subtype="thunk",
            defaults=dict(type="artifact"),
        )
        return eclass.pk

    def validate_text(self, t: str):
        """
        Validate an entry for a given entry class

        :param t: The entry data to validate
        """
        if self.regex:
            return re.match(f"^{self.regex}$", t)
        if self.options:
            return t.strip() in self.options.split("\n")

        return True

    def __eq__(self, other):
        if isinstance(other, EntryClass):
            return self.type == other.type and self.subtype == other.subtype
        return NotImplemented

    def __hash__(self):
        return hash((self.type, self.subtype))

    def save(self, *args, **kwargs):
        if self.regex and self.options:
            raise InvalidClassFormatException()

        try:
            if self.regex:
                re.compile(self.regex)
        except re.error:
            raise InvalidRegexException()

        if self.options is not None:
            self.options = "\n".join(map(lambda x: x.strip(), self.options.split("\n")))

        return super().save(*args, **kwargs)


class Entry(models.Model):
    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)
    is_public: models.BooleanField = models.BooleanField(default=False)
    entry_class: models.ForeignKey[uuid.UUID, EntryClass] = models.ForeignKey(
        EntryClass, on_delete=models.PROTECT, default=EntryClass.get_default_pk
    )

    name: models.CharField = models.CharField()
    description: models.TextField = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "entry_class"], name="unique_name_class"
            )
        ]

    objects = EntryManager()
    entities = EntityManager()
    artifacts = ArtifactManager()

    def __eq__(self, other):
        if isinstance(other, Entry):
            return (
                self.id == other.id
                and self.name == other.name
                and self.description == other.description
                and self.entry_class == other.entry_class
            )
        return NotImplemented

    def __hash__(self):
        return hash((self.id, self.name, self.description, self.entry_class))

    def save(self, *args, **kwargs):
        if not self.entry_class.validate_text(self.name):
            raise InvalidEntryException(self.entry_class.subtype, self.name)

        return super().save(*args, **kwargs)

from django.db import models
from django_lifecycle import AFTER_UPDATE, LifecycleModel, hook
from django_lifecycle.mixins import LifecycleModelMixin, transaction
from django.db.models import Q

from logs.models import LoggableModelMixin

from .managers import (
    EntityManager,
    ArtifactManager,
    EntryManager,
)

from .exceptions import (
    ClassBreaksHierarchyException,
    InvalidClassFormatException,
    InvalidEntryException,
    InvalidRegexException,
)
from .enums import EntryType

import uuid
import re


class EntryClass(LifecycleModelMixin, models.Model, LoggableModelMixin):
    type: models.CharField = models.CharField(max_length=20, choices=EntryType.choices)
    subtype: models.CharField = models.CharField(
        max_length=64, blank=False, primary_key=True
    )
    description: models.TextField = models.TextField(null=True, blank=True)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    regex: models.CharField = models.CharField(max_length=65536, blank=True, default="")
    generative_regex: models.CharField = models.CharField(
        max_length=65536, blank=True, default=""
    )
    options: models.CharField = models.CharField(
        max_length=65536, blank=True, default=""
    )

    catalyst_type: models.CharField = models.CharField(
        max_length=64, blank=True, default=""
    )
    color: models.CharField = models.CharField(max_length=7, default="#e66100")

    prefix: models.CharField = models.CharField(max_length=64, blank=True)

    @classmethod
    def get_default_pk(cls):
        eclass, created = cls.objects.get_or_create(
            subtype="thunk",
            defaults=dict(type="artifact"),
        )
        return eclass.pk

    def delete(self, *args, **kwargs):
        from entries.tasks import remap_notes_task

        notes = []
        for e in self.entries.all():
            notes.extend(e.notes.all())

        unique_note_ids = list({note.id for note in notes})

        from django.db import transaction

        transaction.on_commit(
            lambda: remap_notes_task.delay(unique_note_ids, {self.subtype: None}, {})
        )

        super().delete(*args, **kwargs)

    def rename(self, new_subtype: str):
        if new_subtype == self.subtype or not new_subtype:
            return None

        from django.db import transaction
        from entries.tasks import remap_notes_task

        entries = self.entries.all()
        for entry in entries:
            entry.entry_class_id = new_subtype
        Entry.objects.bulk_update(entries, ["entry_class_id"])

        old_subtype = self.subtype
        self.subtype = new_subtype
        self.save()

        notes = []
        for e in self.entries.all():
            notes.extend(e.notes.all())
        unique_note_ids = list({note.id for note in notes})

        # Schedule remapping to update notes' content asynchronously.
        transaction.on_commit(
            lambda: remap_notes_task.delay(
                unique_note_ids, {old_subtype: new_subtype}, {}
            )
        )

        # Optionally remove the old entry class if needed.
        EntryClass.objects.get(subtype=old_subtype).delete()
        return self

    def validate_text(self, t: str):
        """
        Validate an entry for a given entry class

        :param t: The entry data to validate
        """
        if self.type == EntryType.ARTIFACT:
            if self.regex:
                return re.match(f"^{self.regex}$", t)
            if self.options:
                return t.strip() in self.options.split("\n")
        if self.type == EntryType.ENTITY:
            return t.startswith(self.prefix)

        return True

    def __eq__(self, other):
        if isinstance(other, EntryClass):
            return self.type == other.type and self.subtype == other.subtype
        return NotImplemented

    def __hash__(self):
        return hash((self.type, self.subtype))

    def _propagate_log(self, log):
        return

    def does_entryclass_violate_hierarchy(self):
        parts = self.subtype.split("/")

        possible_parents = ["/".join(parts[:i]) for i in range(1, len(parts))]

        if EntryClass.objects.filter(subtype__in=possible_parents).exists():
            return EntryClass.objects.filter(subtype__in=possible_parents).first()

        return False

    def save(self, *args, **kwargs):
        self.subtype = self.subtype.strip().strip("/")

        if conflict := self.does_entryclass_violate_hierarchy():
            raise ClassBreaksHierarchyException(conflict.subtype)

        if self.type == EntryType.ARTIFACT:
            if self.regex and self.options:
                raise InvalidClassFormatException()

            self.options = self.options.strip()

            if self.options:
                self.options = "\n".join(
                    map(lambda x: x.strip(), self.options.split("\n"))
                ).strip()

                self.generative_regex = ""

            try:
                if self.regex:
                    re.compile(self.regex)
                if self.generative_regex:
                    re.compile(self.generative_regex)
            except re.error:
                raise InvalidRegexException()
        else:
            self.generative_regex = ""

        if self.color and self.color[0] != "#":
            self.color = "#" + self.color

        return super().save(*args, **kwargs)

    def __repr__(self):
        return self.subtype

    @hook(AFTER_UPDATE, when="type", has_changed=True)
    def update_access_level_of_children(self):
        for i in self.entries.all():
            i.save()


class Entry(LifecycleModel, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)
    is_public: models.BooleanField = models.BooleanField(default=False)
    entry_class: models.ForeignKey[uuid.UUID, EntryClass] = models.ForeignKey(
        EntryClass,
        on_delete=models.CASCADE,
        null=False,
        related_name="entries",
    )

    name: models.CharField = models.CharField(max_length=255)
    description: models.TextField = models.TextField(null=True, blank=True)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    # New field: acvec_offset is an unsigned integer.
    acvec_offset: models.PositiveIntegerField = models.PositiveIntegerField(default=0)

    status: models.JSONField = models.JSONField(default=dict, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "entry_class"], name="unique_name_class"
            ),
            # Enforces uniqueness on non-zero acvec_offset values.
            models.UniqueConstraint(
                fields=["acvec_offset"],
                condition=~Q(acvec_offset=0),
                name="unique_non_zero_acvec_offset",
            ),
        ]

    objects = EntryManager()
    entities = EntityManager()
    artifacts = ArtifactManager()

    def __init__(self, *args, **kwargs):
        if "name" in kwargs:
            kwargs["name"] = kwargs["name"].strip()
        super().__init__(*args, **kwargs)

    def __repr__(self):
        return f"[[{self.entry_class.subtype}:{self.name}]]"

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

        self.setup_access()
        return super().save(*args, **kwargs)

    def setup_access(self):
        # Artifacts and public entities have public access
        if self.entry_class.type == EntryType.ARTIFACT or self.is_public:
            self.is_public = True
            self.acvec_offset = 0

        elif self.acvec_offset == 0:
            if self.entry_class.type == EntryType.ENTITY:
                existing_offsets = set(
                    self.__class__.objects.exclude(acvec_offset=0).values_list(
                        "acvec_offset", flat=True
                    )
                )
                offset = 1
                while offset in existing_offsets:
                    offset += 1
                self.acvec_offset = offset

    def delete(self, *args, **kwargs):
        from entries.tasks import remap_notes_task

        from django.db import transaction

        note_ids = list({note.id for note in self.notes.all()})

        transaction.on_commit(
            lambda: remap_notes_task.delay(
                note_ids,
                {},
                {self.entry_class.subtype + ":" + self.name: None},
            )
        )

        super().delete(*args, **kwargs)

    def propagate_from(self, log):
        if self.entry_class.type == EntryType.ENTITY:
            super().propagate_from(log)

    def log_create(self, user):
        super().log_create(user)

    def log_delete(self, user, details=None):
        super().log_delete(user, details)

    def log_edit(self, user, details=None):
        super().log_edit(user, details)

    def log_fetch(self, user, details=None):
        super().log_fetch(user, details)

    @hook(AFTER_UPDATE, when="acvec_offset", has_changed=True)
    def acvec_offset_updated(self):
        from .tasks import update_accesses

        transaction.on_commit(lambda: update_accesses.apply_async((self.id,)))

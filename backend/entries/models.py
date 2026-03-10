"""Entry and relation models for the knowledge graph.

Defines EntryClass (entry type definitions), Entry (entities and artifacts),
Relation (links between entries), Edge (materialized graph edges), and Attachment.
"""

import re
import uuid
from typing import Optional

from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django_lifecycle import AFTER_UPDATE, LifecycleModel, hook
from django_lifecycle.conditions import WhenFieldHasChanged
from django_lifecycle.mixins import LifecycleModelMixin, transaction

from core.fields import BitStringField
from file_transfer.storage import RelationStorage
from logs.models import LoggableModelMixin

from .enums import EntryType, EntryTypeFormat, RelationReason
from .exceptions import (
    ClassBreaksHierarchyException,
    InvalidClassFormatException,
    InvalidEntryException,
    InvalidRegexException,
    OutOfEntitySlotsException,
)
from .managers import (
    ArtifactManager,
    EdgeManager,
    EntityManager,
    EntryManager,
    RelationManager,
)


def attachment_upload_path(instance: "Attachment", filename: str) -> str:
    """Generate upload path for attachments: attachments/{uuid}-{filename}."""
    return f"{instance.id}-{filename}"


class Edge(LifecycleModel):
    """Materialized view row representing a directed edge between two entries in the graph."""

    id = models.CharField(primary_key=True)
    src = models.BigIntegerField(help_text="Source entry ID")
    dst = models.BigIntegerField(help_text="Destination entry ID")

    objects = EdgeManager()

    access_vector: BitStringField = BitStringField(max_length=2048, null=False, default=1 << 2047, varying=False)

    created_at = models.DateTimeField(help_text="When the edge was first created")
    last_seen = models.DateTimeField(help_text="Last time the edge was observed")
    virtual = models.BooleanField(help_text="Whether this edge is virtual (e.g. alias)")

    class Meta:
        managed = False
        db_table = "edges"
        unique_together = ["src", "dst"]


class EntryClass(LifecycleModelMixin, models.Model, LoggableModelMixin):
    """Defines an entry type (subtype) with validation rules and display options."""

    type: models.CharField = models.CharField(max_length=20, choices=EntryType.choices, help_text="Entity or artifact")
    subtype: models.CharField = models.CharField(
        max_length=64, blank=False, primary_key=True, help_text="Unique identifier (e.g. ip/address)"
    )
    description: models.TextField = models.TextField(
        null=True, blank=True, help_text="Human-readable description of this entry class"
    )
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When this class was created")
    format: models.CharField = models.CharField(
        max_length=20,
        choices=EntryTypeFormat.choices,
        default=None,
        null=True,
        help_text="Validation format: regex or options",
    )
    regex: models.CharField = models.CharField(
        max_length=65536, blank=True, default="", help_text="Regex pattern for artifact validation"
    )
    generative_regex: models.CharField = models.CharField(
        max_length=65536, blank=True, default="", help_text="Regex for generating child entries from parent text"
    )
    options: models.CharField = models.CharField(
        max_length=65536, blank=True, default="", help_text="Newline-separated allowed values (alternative to regex)"
    )

    color: models.CharField = models.CharField(max_length=7, default="#e66100", help_text="Hex color for UI display")

    prefix: models.CharField = models.CharField(
        max_length=64, blank=True, help_text="Prefix for entity names (e.g. E- for cases)"
    )

    children = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="parents",
        help_text="Possible children of this entry class",
    )

    @classmethod
    def get_default_pk(cls):
        """Return the primary key of the default 'thunk' entry class, creating it if needed."""
        eclass, created = cls.objects.get_or_create(
            subtype="thunk",
            defaults=dict(type="artifact"),
        )
        return eclass.pk

    def rename(self, new_subtype: Optional[str], user_id: str = None):
        """Rename this entry class to new_subtype, updating all entries and notes."""
        if new_subtype == self.subtype:
            return None

        from django.db import transaction

        from entries.tasks import remap_notes_task

        old_subtype = self.subtype

        notes = []
        for e in self.entries.all():
            notes.extend(e.notes.all())
        unique_note_ids = list({note.id for note in notes})

        if new_subtype is not None:
            entries = self.entries.all()
            for entry in entries:
                entry.entry_class_id = new_subtype
            Entry.objects.bulk_update(entries, ["entry_class_id"])

            self.subtype = new_subtype
            self.save()
        else:
            EntryClass.objects.get(subtype=old_subtype).delete()

        # Schedule remapping to update notes' content asynchronously.
        transaction.on_commit(lambda: remap_notes_task.delay(unique_note_ids, {old_subtype: new_subtype}, {}, user_id))

        return self

    def validate_text(self, t: str):
        """Validate entry text against this class's regex, options, or prefix."""
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

        parent = EntryClass.objects.filter(subtype__in=possible_parents).first()
        if parent:
            return parent

        possible_children = EntryClass.objects.filter(subtype__startswith=self.subtype + "/")
        child = possible_children.first()
        if child:
            return child

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
                self.options = "\n".join(x.strip() for x in self.options.split("\n")).strip()
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

    def match(self, s):
        """Find all matches of regex or options in string s."""
        if self.type == EntryType.ENTITY:
            return []

        if self.regex:
            return re.findall(self.regex, s)
        elif self.options:
            return [o for o in self.options.split("\n") if o.lower() in s.lower()]

        return []

    @hook(AFTER_UPDATE, when="type", has_changed=True)
    def update_access_level_of_children(self):
        for i in self.entries.all():
            i.save()


class Entry(LifecycleModel, LoggableModelMixin):
    """A node in the knowledge graph: either an entity (user-defined) or artifact (data)."""

    id = models.BigAutoField(primary_key=True)
    is_public: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether this entry is visible to all users"
    )

    entry_class: models.ForeignKey[uuid.UUID, EntryClass] = models.ForeignKey(
        EntryClass,
        on_delete=models.CASCADE,
        null=False,
        related_name="entries",
        help_text="Type of this entry (entity or artifact subtype)",
    )

    name: models.CharField = models.CharField(max_length=1024, help_text="Display name, validated by entry_class rules")
    description: models.TextField = models.TextField(null=True, blank=True, help_text="Optional description")
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="Creation timestamp")
    last_seen: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, null=False, help_text="Last activity timestamp"
    )

    relations = GenericRelation("entries.Relation", related_query_name="entry")

    acvec_offset: models.PositiveIntegerField = models.PositiveIntegerField(
        default=0, help_text="Bit offset in access vector for entity visibility"
    )

    status: models.JSONField = models.JSONField(
        default=dict, null=True, help_text="Transient status (e.g. during access updates)"
    )

    class Meta:
        ordering = ["-last_seen"]
        constraints = [
            models.UniqueConstraint(fields=["name", "entry_class"], name="unique_name_class"),
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

    location: gis_models.PointField = gis_models.PointField(
        null=True, blank=True, srid=0, dim=2, help_text="Optional geographic location"
    )
    degree: models.IntegerField = models.IntegerField(default=0, help_text="Number of outgoing edges in the graph")

    aliases = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="aliased_by",
        help_text="Entries that are equivalent to this one",
    )

    def __init__(self, *args, **kwargs):
        if "name" in kwargs:
            kwargs["name"] = kwargs["name"].strip()
        super().__init__(*args, **kwargs)

    def __repr__(self):
        return f"[[{self.entry_class.subtype}:{self.name}]]"

    def __eq__(self, other):
        if isinstance(other, Entry):
            return self.id == other.id
        return NotImplemented

    def __hash__(self):
        return hash(self.id)

    def save(self, *args, **kwargs):
        if not self.entry_class.validate_text(self.name):
            raise InvalidEntryException(self.entry_class.subtype, self.name)

        self.setup_access()
        return super().save(*args, **kwargs)

    def setup_access(self):
        """Set is_public and acvec_offset based on entry type and visibility."""
        # Artifacts and public entities have public access
        if self.entry_class.type == EntryType.ARTIFACT or self.is_public:
            self.is_public = True
            self.acvec_offset = 0

        elif self.acvec_offset == 0:
            if self.entry_class.type == EntryType.ENTITY:
                existing_offsets = set(
                    self.__class__.objects.exclude(acvec_offset=0).values_list("acvec_offset", flat=True)
                )
                offset = 1
                while offset in existing_offsets:
                    offset += 1
                self.acvec_offset = offset

        if self.acvec_offset > 2047:
            raise OutOfEntitySlotsException()

    def delete_renaming(self, user_id: str, *args, **kwargs):
        from django.db import transaction

        from entries.tasks import remap_notes_task

        note_ids = list({note.id for note in self.notes.all()})

        transaction.on_commit(
            lambda: remap_notes_task.delay(
                note_ids,
                {},
                {self.entry_class.subtype + ":" + self.name: None},
                user_id,
            )
        )

        super().delete(*args, **kwargs)

    def ping(self):
        """Update last_seen to now."""
        self.last_seen = timezone.now()
        self.save(update_fields=["last_seen"])

    @hook(AFTER_UPDATE, condition=WhenFieldHasChanged("acvec_offset", True))
    def acvec_offset_updated(self):
        from .tasks import update_accesses

        transaction.on_commit(lambda: update_accesses.apply_async((self.id,)))

    def get_acvec(self):
        """Return access vector bitmask for this entry."""
        return 1 | (1 << self.acvec_offset)

    def reconnect_aliases(self):
        from entries.models import Relation

        Relation.objects.filter(e1=self, reason=RelationReason.ALIAS).delete()

        for e in self.aliases.all():
            Relation.objects.create(
                e1=self,
                e2=e,
                content_object=self,
                reason=RelationReason.ALIAS,
                access_vector=e.get_acvec(),
                virtual=True,
            )

    def aliasqs(self, user):
        """Return queryset of this entry plus all aliases visible to the user."""
        rels = (
            Edge.objects.accessible(user)
            .filter(
                src=self.id,
                virtual=True,
            )
            .values_list("dst", flat=True)
        )

        qs = Entry.objects.filter(Q(id__in=rels) | Q(id=self.id)).distinct()
        return qs


class Relation(LifecycleModel):
    """Generic link between two entries with reason, access control, and optional attachments."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)

    access_vector: BitStringField = BitStringField(max_length=2048, null=False, default=1 << 2047, varying=False)

    inherit_av = models.BooleanField(default=False, help_text="Whether to inherit access from content_object")

    e1 = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="relations_1", help_text="First entry (lower ID)"
    )
    e2 = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="relations_2", help_text="Second entry (higher ID)"
    )

    created_at = models.DateTimeField(default=timezone.now, help_text="Creation timestamp")
    last_seen = models.DateTimeField(default=timezone.now, help_text="Last observation")

    object_id = models.UUIDField(help_text="ID of the content object")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    content_object = GenericForeignKey("content_type", "object_id")

    reason: models.CharField = models.CharField(
        max_length=255,
        null=False,
        blank=False,
        choices=RelationReason.choices,
        help_text="Why this relation exists (digest, enrichment, contains, etc.)",
    )
    reason_context: models.CharField = models.CharField(
        max_length=255, null=True, blank=True, help_text="Additional context for reason"
    )

    details: models.JSONField = models.JSONField(default=dict, blank=True, help_text="Extra relation metadata")

    objects = RelationManager()

    virtual = models.BooleanField(default=False, help_text="Whether this relation is virtual (e.g. alias)")

    def save(self, *args, **kwargs):
        if self.e1.id > self.e2.id:
            self.e1, self.e2 = self.e2, self.e1
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-last_seen"]

    def __str__(self):
        return f"Relation [{self.reason}]({self.e1}-{self.e2}) "


class Attachment(LifecycleModel):
    """File attached to a relation (e.g. enrichment evidence)."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4)
    relation: models.ForeignKey = models.ForeignKey(
        Relation, on_delete=models.CASCADE, related_name="attachments", help_text="Relation this attachment belongs to"
    )
    name: models.CharField = models.CharField(max_length=255, help_text="Original filename for download")
    file: models.FileField = models.FileField(
        upload_to=attachment_upload_path,
        storage=RelationStorage,
        help_text="Stored file path",
    )
    type: models.CharField = models.CharField(max_length=255, help_text="MIME type or file category")
    context: models.JSONField = models.JSONField(default=dict, help_text="Extra metadata (e.g. enrichment source)")

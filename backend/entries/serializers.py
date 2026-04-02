"""Serializers for entries, entry classes, relations, and attachments."""

from datetime import timedelta

from django.db.models import Q
from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.plumbing import ResolvedComponent
from drf_spectacular.utils import Direction, extend_schema_field
from rest_framework import serializers

from access.enums import AccessType
from access.models import Access
from core.exceptions import PermissionDeniedException

from .enums import EntryType
from .exceptions import (
    DuplicateEntityException,
    DuplicateEntryException,
    EntryTypeMismatchException,
    EntryTypeNotFoundException,
    EntryTypeRequiredException,
    InvalidAliasTargetException,
)
from .models import Attachment, Entry, EntryClass, Relation


class EntryListCompressedTreeSerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntryListCompressedTreeSerializer."""

    target_class = "entries.serializers.EntryListCompressedTreeSerializer"

    def map_serializer(self, auto_schema, direction: Direction):
        # --- define the standalone component schema ---
        entry_obj_schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "id": {"type": "number"},
            },
            "additionalProperties": {
                "oneOf": [
                    {"type": "string"},
                    {"type": "number"},
                ]
            },
            "required": ["name", "id"],
            "title": "EntryCompressedTreeObjectValue",
            "description": "Entry object inside the compressed tree",
        }

        component = ResolvedComponent(
            name="EntryCompressedTreeObject",
            type=ResolvedComponent.SCHEMA,
            object="EntryCompressedTreeObject",
            schema=entry_obj_schema,
        )
        auto_schema.registry.register_on_missing(component)

        entry_value_schema = {
            "oneOf": [
                {
                    "type": "string",
                    "description": "Entry name (when using single field)",
                    "title": "EntryCompressedTreeStringValue",
                },
                {"$ref": "#/components/schemas/EntryCompressedTreeObject"},
            ],
            "title": "EntryCompressedTreeValue",
        }

        entry_value_component = ResolvedComponent(
            name="EntryCompressedTreeValue",
            type=ResolvedComponent.SCHEMA,
            object="EntryCompressedTreeValue",
            schema=entry_value_schema,
        )
        auto_schema.registry.register_on_missing(entry_value_component)

        item_schema = {"$ref": "#/components/schemas/EntryCompressedTreeValue"}

        return {
            "type": "object",
            "properties": {
                "entities": {
                    "type": "object",
                    "additionalProperties": {"type": "array", "items": item_schema},
                    "description": "Entities organized by subtype",
                },
                "artifacts": {
                    "type": "object",
                    "additionalProperties": {"type": "array", "items": item_schema},
                    "description": "Artifacts organized by subtype",
                },
            },
            "required": ["entities", "artifacts"],
            "description": (
                "A compressed tree representation of entries, organized by type (entities/artifacts) and subtype."
            ),
            "title": "EntryListCompressedTree",
        }

    def get_schema_operation_parameters(self, auto_schema, *args, **kwargs):
        return [
            {
                "name": "fields",
                "in": "query",
                "description": "Comma-separated list of fields to include in the serialized output",
                "schema": {"type": "string"},
                "example": "name,id,description",
            }
        ]


class EntryTypesCompressedTreeSerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntryTypesCompressedTreeSerializer."""

    target_class = "entries.serializers.EntryTypesCompressedTreeSerializer"

    def map_serializer(self, auto_schema, direction):
        # Define the schema for the serializer
        return {"type": "array", "items": {"type": "string"}}

    def get_schema_operation_parameters(self, auto_schema, *args, **kwargs):
        return [
            {
                "name": "fields",
                "in": "query",
                "description": "Comma-separated list of fields to include in the serialized output",
                "schema": {"type": "string"},
                "example": "name",
            }
        ]


class EntrySerializerMinimalExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntrySerializerMinimal."""

    target_class = "entries.serializers.EntrySerializerMinimal"

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)
        schema["properties"]["type"] = {
            "type": "string",
        }
        schema["properties"]["subtype"] = {
            "type": "string",
        }
        schema["properties"]["color"] = {
            "type": "string",
        }
        return schema


class EntryListCompressedTreeSerializer(serializers.BaseSerializer):
    """Serialize entries as a tree grouped by type and subtype."""

    def __init__(self, *args, fields=("name",), **kwargs):
        self.fields = fields
        super().__init__(*args, **kwargs)

    def serialize_entry(self, entry):
        """Serialize a single entry to a value or dict based on configured fields."""
        if len(self.fields) == 1:
            return getattr(entry, self.fields[0])

        return {
            field: (
                None
                if not hasattr(entry, field)
                else getattr(entry, field)
                if field != "location"
                else [entry.location.x, entry.location.y]
                if entry.location
                else None
            )
            for field in self.fields
        }

    def add_to_tree(self, tree, entry):
        """Add entry to the tree under entities or artifacts by subtype."""
        if entry.entry_class.type == EntryType.ENTITY:
            tree["entities"].setdefault(entry.entry_class.subtype, []).append(self.serialize_entry(entry))
        else:
            tree["artifacts"].setdefault(entry.entry_class.subtype, []).append(self.serialize_entry(entry))

    def to_representation(self, data):
        tree = {"entities": {}, "artifacts": {}}

        for entry in data:
            self.add_to_tree(tree, entry)

        return tree


class EntryTypesCompressedTreeSerializer(serializers.BaseSerializer):
    """Serialize unique entry subtypes as a flat list."""

    def __init__(self, *args, exclude=None, fields=("name",), **kwargs):
        self.fields = fields
        self.exclude = exclude if exclude is not None else []
        super().__init__(*args, **kwargs)

    def to_representation(self, data):
        unique_subtypes = (
            data.filter(~Q(entry_class__subtype__in=self.exclude))
            .values_list("entry_class__subtype", flat=True)
            .distinct()
        )

        return list(unique_subtypes)


class EntryClassSerializerMinimal(serializers.ModelSerializer):
    """Minimal entry class: type, subtype, color."""

    class Meta:
        model = EntryClass
        fields = ["type", "subtype", "color"]


class EntrySerializerMinimal(serializers.ModelSerializer):
    """Minimal entry: id, name, entry_class (flattened)."""

    entry_class = EntryClassSerializerMinimal(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class"]

    def to_representation(self, instance):
        """Flatten entry_class fields into the representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation


class EntryClassSerializerNoChildren(serializers.ModelSerializer):
    """Entry class without children relation (for nesting in entry serializers)."""

    format = serializers.CharField(max_length=20, allow_null=True, help_text="Display format for the entry class")

    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "generative_regex",
            "regex",
            "options",
            "prefix",
            "color",
            "format",
        ]


class EntryClassSerializer(serializers.ModelSerializer):
    """Full entry class with children relation and children_detail."""

    children = serializers.PrimaryKeyRelatedField(
        queryset=EntryClass.objects.all(),
        many=True,
        write_only=True,
        required=False,
        help_text="Child entry class IDs",
    )
    children_detail = serializers.SerializerMethodField(read_only=True)
    format = serializers.CharField(max_length=20, allow_null=True, help_text="Display format for the entry class")

    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "generative_regex",
            "regex",
            "options",
            "prefix",
            "color",
            "children",
            "format",
            "children_detail",
        ]

    def create(self, validated_data):
        children_data = validated_data.pop("children", [])
        eclass = EntryClass.objects.create(**validated_data)
        eclass.children.set(children_data)
        return eclass

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children_detail(self, obj):
        return EntryClassSerializerNoChildren(obj.children.all(), many=True).data


class EntryClassSerializerCount(EntryClassSerializer):
    """Entry class with entry count (admin only, capped at 100)."""

    count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "generative_regex",
            "regex",
            "options",
            "prefix",
            "color",
            "children",
            "children_detail",
            "count",
        ]

    def get_count(self, obj) -> int:
        # Use annotated count if available (for performance), otherwise fallback to query
        if hasattr(obj, "entry_count"):
            return min(obj.entry_count, 100)

        entry_count = Entry.objects.filter(entry_class=obj).values("id")[:101].count()
        entry_count = min(entry_count, 100)
        return entry_count


class NextNameResponseSerializer(serializers.Serializer):
    """Serializer for the next available name response."""

    name = serializers.CharField(allow_null=True, help_text="Next available name, or null if class has no prefix")


class EntryResponseSerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntryResponseSerializer."""

    target_class = "entries.serializers.EntryResponseSerializer"
    match_subclasses = True

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)

        properties = schema.get("properties", {})
        properties.pop("entry_class", None)

        properties["type"] = {
            "type": "string",
            "description": "Type of the entry (e.g., entity, artifact)",
        }
        properties["subtype"] = {
            "type": "string",
            "description": "Subtype for the entry",
        }
        properties["description"] = {
            "type": "string",
            "description": "Description of the entry",
            "nullable": True,
        }
        properties["color"] = {
            "type": "string",
            "description": "Color associated with the entry class",
            "nullable": True,
        }

        required = set(schema.get("required", []))

        required.add("subtype")
        required.add("type")
        schema["required"] = list(required)

        return schema


class EntryResponseSerializer(serializers.ModelSerializer):
    """Entry with flattened entry_class fields for API responses."""

    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "entry_class"]

    def to_representation(self, instance):
        """Flatten entry_class fields into the representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Extract entry_class fields into nested dict for validation."""
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = entry_class_internal
        return internal


class EntrySerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntrySerializer."""

    target_class = "entries.serializers.EntrySerializer"
    match_subclasses = True

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)
        schema["properties"]["subtype"] = {
            "type": "string",
            "description": "Subtype for the entry",
        }
        required = schema.get("required", [])
        if "subtype" not in required:
            required.append("subtype")
        schema["required"] = required
        return schema


class EntrySerializer(serializers.ModelSerializer):
    """Entry with flattened entry_class for create/update."""

    entry_class = EntryClassSerializerNoChildren(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class"]

    def to_representation(self, instance):
        """Flatten entry_class fields into the representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Extract entry_class fields into nested dict for validation."""
        entry_class_internal = {}

        for key in EntryClassSerializerNoChildren.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = entry_class_internal
        return internal


class EntitySerializer(serializers.ModelSerializer):
    """Serializer for entity creation and update with aliases."""

    entry_class = EntryClassSerializerNoChildren(read_only=True)
    aliases = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(),
        many=True,
        write_only=True,
        required=False,
        help_text="Artifact entry IDs to alias to this entity",
    )
    aliases_detail = EntrySerializer(source="aliases", many=True, read_only=True)

    class Meta:
        model = Entry
        fields = [
            "id",
            "name",
            "description",
            "is_public",
            "entry_class",
            "aliases",
            "aliases_detail",
        ]
        extra_kwargs = {
            "name": {"help_text": "Entity name (unique per subtype)"},
            "description": {"help_text": "Optional entity description"},
            "is_public": {"help_text": "Whether the entity is publicly visible"},
        }

    def exists(self) -> bool:
        """Check for duplicate entity (race-condition guard inside transaction)."""
        return Entry.objects.filter(
            name=self.validated_data["name"],
            entry_class__subtype=self.validated_data["entry_class"].subtype,
        ).exists()

    def to_representation(self, instance):
        """Flatten entry_class fields into the representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        representation.pop("aliases", None)

        return representation

    def to_internal_value(self, data):
        """Extract entry_class fields into nested dict for validation."""
        data["type"] = EntryType.ENTITY

        if "subtype" not in data or not data["subtype"]:
            raise EntryTypeRequiredException()

        internal = super().to_internal_value(data)
        try:
            internal["entry_class"] = EntryClass.objects.get(type=EntryType.ENTITY, subtype=data["subtype"])
        except EntryClass.DoesNotExist:
            raise EntryTypeNotFoundException()
        return internal

    def validate(self, data):
        """Check for duplicate entity name, then apply superclass validations.

        Args:
            data: Dictionary containing the attributes of the Entry.

        Returns:
            The validated data.

        Raises:
            DuplicateEntityException: If another entity has the same name (409).
        """
        if data["entry_class"].type != EntryType.ENTITY:
            raise EntryTypeMismatchException(detail="This entry is not an entity.")

        if not data.get("name"):
            raise serializers.ValidationError({"name": "Enter a name."})

        aliases = data.get("aliases", [])
        for alias in aliases:
            if alias.entry_class.type != EntryType.ARTIFACT:
                raise InvalidAliasTargetException()
        if aliases:
            request = self.context.get("request")
            if request and not request.user.is_cradle_admin:
                if not Access.objects.has_access_to_entities(
                    request.user, set(aliases), {AccessType.READ, AccessType.READ_WRITE}
                ):
                    raise PermissionDeniedException(
                        detail="You do not have access to one or more of the linked entries."
                    )

        # Check for duplicate entity (same name + subtype)
        qs = Entry.objects.filter(entry_class=data["entry_class"], name=data["name"])
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise DuplicateEntityException(detail="An entity with this name already exists.")

        return super().validate(data)

    def create(self, validated_data):
        aliases_data = validated_data.pop("aliases", [])
        entry = Entry.objects.create(**validated_data)
        entry.aliases.set(aliases_data)
        entry.reconnect_aliases()
        return entry

    def update(self, instance, validated_data):
        aliases_data = validated_data.pop("aliases", None)
        instance = super().update(instance, validated_data)

        if aliases_data is not None:
            # Get current alias IDs from the instance
            current_alias_ids = set(instance.aliases.values_list("id", flat=True))

            # Normalize incoming alias data to IDs
            new_alias_ids = {alias.id if hasattr(alias, "id") else alias for alias in aliases_data}

            if current_alias_ids != new_alias_ids:
                instance.aliases.set(aliases_data)
                instance.reconnect_aliases()

        return instance


class EntitySerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntitySerializer."""

    target_class = "entries.serializers.EntitySerializer"
    match_subclasses = True

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)

        properties = schema.get("properties", {})
        properties.pop("entry_class", None)

        properties["type"] = {
            "type": "string",
            "description": "Type of the entry (should be 'entity')",
        }
        properties["subtype"] = {
            "type": "string",
            "description": "Subtype for the entity",
        }

        required = set(schema.get("required", []))
        required.add("subtype")
        required.add("type")
        schema["required"] = list(required)

        return schema


class ArtifactSerializer(serializers.ModelSerializer):
    """Serializer for artifact creation and update."""

    type = serializers.ReadOnlyField(default="artifact")

    class Meta:
        model = Entry
        fields = ["name", "subtype"]
        extra_kwargs = {
            "name": {"help_text": "Artifact name (unique per subtype)"},
            "subtype": {"help_text": "Entry class subtype (e.g. ip, domain, hash)"},
        }

    def to_representation(self, instance):
        """Flatten entry_class fields into the representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Extract entry_class fields into nested dict for validation."""
        data["type"] = EntryType.ARTIFACT
        entry_class_internal = {}
        for key in EntryClassSerializerNoChildren.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = EntryClass(**entry_class_internal)
        return internal

    def validate(self, data):
        """Check for duplicate artifact name, then apply superclass validations.

        Args:
            data: Dictionary containing the attributes of the Entry.

        Returns:
            The validated data.

        Raises:
            DuplicateEntryException: If another artifact has the same name (409).
        """
        try:
            entry_class = EntryClass.objects.get(subtype=data["entry_class"].subtype)
        except EntryClass.DoesNotExist:
            # New subtype - create() will create it via get_or_create
            pass
        else:
            if entry_class.type != EntryType.ARTIFACT:
                raise EntryTypeMismatchException(detail="That entry type is not an artifact.")
            data["entry_class"] = entry_class

        entry_exists = Entry.objects.filter(
            entry_class__subtype=data["entry_class"].subtype, name=data["name"]
        ).exists()
        if entry_exists:
            raise DuplicateEntryException(detail="An entry with this name already exists.")

        return super().validate(data)

    def exists(self) -> bool:
        """Check for duplicate entry (race-condition guard inside transaction)."""
        return Entry.objects.filter(
            name=self.validated_data["name"],
            entry_class__subtype=self.validated_data["entry_class"].subtype,
        ).exists()

    def create(self, validated_data):
        """Create a new Entry from validated data.

        Ensures EntryClass exists (get_or_create if new subtype).

        Args:
            validated_data: Dictionary containing the attributes of the Entry.

        Returns:
            The created Entry.
        """
        entry_class = validated_data["entry_class"]
        entry_class_data = EntryClassSerializerNoChildren(instance=entry_class).data
        subtype = entry_class_data.pop("subtype")
        entry_class, _ = EntryClass.objects.get_or_create(subtype=subtype, defaults=entry_class_data)
        validated_data["entry_class"] = entry_class

        return super().create(validated_data)


class EntryPublishSerializer(serializers.ModelSerializer):
    """Entry for publish output with subtype included."""

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "description"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["subtype"] = instance.entry_class.subtype
        return data


class RelationSerializer(serializers.ModelSerializer):
    """Relation with minimal entry details for list views."""

    e1 = EntrySerializerMinimal(read_only=True)
    e2 = EntrySerializerMinimal(read_only=True)

    class Meta:
        model = Relation
        fields = [
            "id",
            "e1",
            "e2",
            "created_at",
            "last_seen",
            "reason",
            "details",
        ]
        read_only_fields = ["created_at", "last_seen", "id"]
        ref_name = "Relation"
        extra_kwargs = {
            "e1": {"help_text": "Source entry"},
            "e2": {"help_text": "Target entry"},
            "reason": {"help_text": "Why the relation exists"},
            "details": {"help_text": "Additional relation metadata"},
        }


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for Attachment model with presigned download URL."""

    presigned_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "name",
            "type",
            "context",
            "presigned_url",
        ]
        read_only_fields = ["id", "presigned_url"]
        extra_kwargs = {
            "name": {"help_text": "Attachment display name"},
            "type": {"help_text": "Attachment type (e.g. screenshot, document)"},
            "context": {"help_text": "Context where the attachment was added"},
        }

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_presigned_url(self, obj):
        """Generate presigned URL for attachment download."""
        from file_transfer.s3_utils import presign_get
        from file_transfer.storage import RelationStorage

        if not obj.file:
            return None

        try:
            return presign_get(
                RelationStorage.bucket_name,
                obj.file.name,
                expires_in=int(timedelta(days=7).total_seconds()),
                response_content_disposition=f'attachment; filename="{obj.name}"',
            )
        except Exception:
            return None


class RelationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Relation with attachments."""

    e1 = EntrySerializerMinimal(read_only=True)
    e2 = EntrySerializerMinimal(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Relation
        fields = [
            "id",
            "e1",
            "e2",
            "created_at",
            "last_seen",
            "reason",
            "reason_context",
            "details",
            "virtual",
            "attachments",
        ]
        read_only_fields = ["created_at", "last_seen", "id"]
        ref_name = "RelationDetail"

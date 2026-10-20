"""Serializers for entries, entry classes, relations, and attachments."""

from collections.abc import Mapping
from datetime import timedelta

from django.db.models import Q
from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.plumbing import ResolvedComponent
from drf_spectacular.utils import Direction, extend_schema_field
from rest_framework import serializers

from core.exceptions import PermissionDeniedException
from file_transfer.s3_utils import presign_get
from file_transfer.storage import RelationStorage
from file_transfer.uploads.flows import sanitize_upload_filename
from teams.exceptions import TeamNotFoundException
from teams.models import Team
from teams.serializers import TeamSummarySerializer

from .enums import EntryType, EntryTypeFormat
from .exceptions import (
    AdminOnlyEntityCreateException,
    AdminOnlyEntityPublicStatusException,
    DuplicateEntityException,
    EntryTypeMismatchException,
    EntryTypeNotFoundException,
    EntryTypeRequiredException,
    InvalidAliasTargetException,
    InvalidEntryException,
)
from .models import Attachment, Entry, EntryClass, Relation


class EntryListCompressedTreeSerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema extension for EntryListCompressedTreeSerializer."""

    target_class = "entries.serializers.EntryListCompressedTreeSerializer"

    def map_serializer(self, auto_schema, direction: Direction):
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


class EntryClassOptionsField(serializers.ListField):
    """Allowed values as a list; stored as newline-separated text on EntryClass.options."""

    child = serializers.CharField(allow_blank=True, trim_whitespace=True)
    max_stored_length = EntryClass._meta.get_field("options").max_length

    def __init__(self, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("help_text", "Allowed values (alternative to regex)")
        super().__init__(**kwargs)

    def to_representation(self, data):
        return [option for option in (data or "").split("\n") if option]

    def to_internal_value(self, data):
        options = [option for option in super().to_internal_value(data) if option]
        if any("\n" in option for option in options):
            raise serializers.ValidationError("Options cannot contain line breaks.")
        stored = "\n".join(options)
        if len(stored) > self.max_stored_length:
            raise serializers.ValidationError(f"Options exceed {self.max_stored_length} characters in total.")
        return stored


class EntryClassSerializerNoChildren(serializers.ModelSerializer):
    """Entry class without children relation (for nesting in entry serializers)."""

    format = serializers.ChoiceField(
        choices=EntryTypeFormat.choices,
        allow_null=True,
        required=False,
        help_text="Validation format: regex or options.",
    )
    options = EntryClassOptionsField()

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
    """Full entry class with its children (read) and child_subtypes (write)."""

    child_subtypes = serializers.PrimaryKeyRelatedField(
        source="children",
        queryset=EntryClass.objects.all(),
        many=True,
        write_only=True,
        required=False,
        help_text="Subtypes of the child entry classes",
    )
    children = serializers.SerializerMethodField(read_only=True)
    format = serializers.ChoiceField(
        choices=EntryTypeFormat.choices,
        allow_null=True,
        required=False,
        help_text="Validation format: regex or options.",
    )
    options = EntryClassOptionsField()

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
            "child_subtypes",
            "format",
            "children",
        ]

    def to_internal_value(self, data):
        if isinstance(data, Mapping) and isinstance(data.get("subtype"), str):
            data = data.copy()
            data["subtype"] = EntryClass.normalize_subtype(data["subtype"])
        return super().to_internal_value(data)

    def create(self, validated_data):
        children_data = validated_data.pop("children", [])
        eclass = EntryClass.objects.create(**validated_data)
        eclass.children.set(children_data)
        return eclass

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
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
            "child_subtypes",
            "children",
            "count",
        ]

    def get_count(self, obj) -> int:
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
    alias_ids = serializers.PrimaryKeyRelatedField(
        source="aliases",
        queryset=Entry.objects.all(),
        many=True,
        write_only=True,
        required=False,
        help_text="Artifact entry IDs to alias to this entity",
    )
    aliases = EntrySerializer(many=True, read_only=True, help_text="Artifact entries aliased to this entity")
    team = TeamSummarySerializer(read_only=True, allow_null=True, help_text="Team that owns this entity")
    team_id = serializers.UUIDField(
        write_only=True,
        required=False,
        allow_null=True,
        help_text="On create, the team that will own the entity: required unless you are an admin, and you must "
        "lead it. Change an existing entity's team through the owner endpoint.",
    )

    class Meta:
        model = Entry
        fields = [
            "id",
            "name",
            "description",
            "is_public",
            "entry_class",
            "alias_ids",
            "aliases",
            "team",
            "team_id",
        ]
        extra_kwargs = {
            "name": {"help_text": "Entity name (unique per subtype)"},
            "description": {"help_text": "Optional entity description"},
            "is_public": {"help_text": "Whether the entity is publicly visible"},
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
        """Resolve ``subtype`` to the entity's entry class; a partial update may leave it out."""
        if not isinstance(data, Mapping):
            raise serializers.ValidationError({"non_field_errors": ["Send the entity as a JSON object."]})

        if not data.get("subtype"):
            if self.partial and self.instance is not None:
                return super().to_internal_value(data)
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
            InvalidAliasTargetException: If an alias is not an artifact.
            PermissionDeniedException: If a newly linked alias is not visible to the (non-admin) user.
            AdminOnlyEntityCreateException: If a non-admin creates an entity without a team they lead.
            AdminOnlyEntityPublicStatusException: If a non-admin creates a public entity.
            TeamNotFoundException: If ``team_id`` names no team.
        """
        # A partial update keeps the current class and name unless it changes them.
        entry_class = data.get("entry_class", self.instance.entry_class if self.instance else None)
        name = data.get("name", self.instance.name if self.instance else None)

        if entry_class.type != EntryType.ENTITY:
            raise EntryTypeMismatchException(detail="This entry is not an entity.")

        if not name:
            raise serializers.ValidationError({"name": "Enter a name."})

        aliases = data.get("aliases", [])
        for alias in aliases:
            if alias.entry_class.type != EntryType.ARTIFACT:
                raise InvalidAliasTargetException()
        request = self.context.get("request")
        if aliases and request and not request.user.is_cradle_admin:
            new_ids = {alias.pk for alias in aliases}
            if self.instance is not None:
                new_ids -= set(self.instance.aliases.values_list("pk", flat=True))
            if new_ids and Entry.objects.accessible(request.user).filter(pk__in=new_ids).count() != len(new_ids):
                raise PermissionDeniedException(detail="You do not have access to one or more of the linked entries.")

        team_id = data.pop("team_id", None)
        if self.instance is None:
            data["team"] = self._owning_team(request, team_id)
            if data.get("is_public") and request is not None and not request.user.is_cradle_admin:
                raise AdminOnlyEntityPublicStatusException(detail="Only administrators can create public entities.")
        elif team_id is not None:
            raise serializers.ValidationError({"team_id": "Change an entity's owning team on its Teams tab."})

        qs = Entry.objects.filter(entry_class=entry_class, name=name)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise DuplicateEntityException(detail="An entity with this name already exists.")

        return super().validate(data)

    @staticmethod
    def _owning_team(request, team_id) -> Team | None:
        """Team a new entity is created for. Admins may omit it; anyone else must lead it."""
        is_admin = request is None or request.user.is_cradle_admin
        if team_id is None:
            if is_admin:
                return None
            raise AdminOnlyEntityCreateException(detail="Choose a team you lead to own the new entity.")
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            raise TeamNotFoundException(detail="That team could not be found.")
        if not is_admin and not team.is_lead(request.user):
            raise AdminOnlyEntityCreateException(detail="You can only create entities for teams you lead.")
        return team

    def create(self, validated_data):
        aliases_data = validated_data.pop("aliases", [])
        team = validated_data.pop("team", None)
        entry = Entry.objects.create(**validated_data)
        entry.aliases.set(aliases_data)
        entry.reconnect_aliases()
        if team is not None:
            team.take_ownership(entry)
        return entry

    def update(self, instance, validated_data):
        aliases_data = validated_data.pop("aliases", None)
        instance = super().update(instance, validated_data)

        if aliases_data is not None:
            current_alias_ids = set(instance.aliases.values_list("id", flat=True))

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
    """Serializer for artifact creation; the artifact type must already exist."""

    subtype = serializers.CharField(write_only=True, help_text="Entry class subtype (e.g. ip, domain, hash)")

    class Meta:
        model = Entry
        fields = ["name", "subtype"]
        extra_kwargs = {"name": {"help_text": "Artifact name (unique per subtype)"}}

    def validate(self, data):
        """Resolve the artifact type and check the name against its format; the view rejects duplicates.

        Raises:
            EntryTypeNotFoundException: If the subtype does not exist (404).
            EntryTypeMismatchException: If the subtype is not an artifact type.
            InvalidEntryException: If the name does not match the type's regex or options.
        """
        subtype = data.pop("subtype")
        try:
            entry_class = EntryClass.objects.get(subtype=subtype)
        except EntryClass.DoesNotExist:
            raise EntryTypeNotFoundException()
        if entry_class.type != EntryType.ARTIFACT:
            raise EntryTypeMismatchException(detail="That entry type is not an artifact.")
        if not entry_class.validate_text(data["name"]):
            raise InvalidEntryException(entry_class.subtype, data["name"])
        data["entry_class"] = entry_class
        return data

    def to_representation(self, instance):
        return EntrySerializer(instance).data


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

    src = EntrySerializerMinimal(source="e1", read_only=True, help_text="Source entry")
    dst = EntrySerializerMinimal(source="e2", read_only=True, help_text="Destination entry")
    last_seen_at = serializers.DateTimeField(source="last_seen", read_only=True, help_text="Last observation")

    class Meta:
        model = Relation
        fields = [
            "id",
            "src",
            "dst",
            "created_at",
            "last_seen_at",
            "reason",
            "details",
        ]
        read_only_fields = ["created_at", "id"]
        ref_name = "Relation"
        extra_kwargs = {
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
        if not obj.file:
            return None

        try:
            return presign_get(
                RelationStorage.bucket_name,
                obj.file.name,
                expires_in=int(timedelta(days=7).total_seconds()),
                response_content_disposition=(
                    f'attachment; filename="{sanitize_upload_filename(obj.name, default="download")}"'
                ),
            )
        except Exception:
            return None


class RelationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Relation with attachments."""

    src = EntrySerializerMinimal(source="e1", read_only=True, help_text="Source entry")
    dst = EntrySerializerMinimal(source="e2", read_only=True, help_text="Destination entry")
    attachments = AttachmentSerializer(many=True, read_only=True)
    last_seen_at = serializers.DateTimeField(source="last_seen", read_only=True, help_text="Last observation")

    class Meta:
        model = Relation
        fields = [
            "id",
            "src",
            "dst",
            "created_at",
            "last_seen_at",
            "reason",
            "reason_context",
            "details",
            "virtual",
            "attachments",
        ]
        read_only_fields = ["created_at", "id"]
        ref_name = "RelationDetail"

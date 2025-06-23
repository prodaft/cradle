from rest_framework import serializers
from .models import Entry, EntryClass, Relation
from .enums import EntryType
from django.db.models import Q


from .exceptions import (
    DuplicateEntryException,
    EntryTypeMismatchException,
    EntryMustHaveASubtype,
    EntryTypeDoesNotExist,
)

from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.utils import extend_schema_field


class EntryCompressedTreeValueSerializer(serializers.Serializer):
    """Serializer for individual entry values in compressed tree structure."""

    # This can be either a string (single field) or an object (multiple fields)
    name = serializers.CharField(
        required=False, help_text="Entry name (when using single field)"
    )
    id = serializers.UUIDField(required=False, help_text="Entry ID")
    description = serializers.CharField(required=False, help_text="Entry description")
    location = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        help_text="Location coordinates [x, y]",
    )

    class Meta:
        ref_name = "EntryCompressedTreeValue"

    def to_representation(self, instance):
        # Handle both string (single field) and dict (multiple fields) cases
        if isinstance(instance, str):
            return instance
        elif isinstance(instance, dict):
            return instance
        else:
            # Fallback for unexpected types
            return str(instance)


class EntryListCompressedTreeSerializerExtension(OpenApiSerializerExtension):
    target_class = "entries.serializers.EntryListCompressedTreeSerializer"

    def map_serializer(self, auto_schema, direction):
        # Define inline schema but with explicit title to avoid auto-generation
        item_schema = {
            "oneOf": [
                {
                    "type": "string",
                    "description": "Entry name (when using single field)",
                    "title": "EntryCompressedTreeStringValue",
                },
                {
                    "type": "object",
                    "additionalProperties": {
                        "oneOf": [
                            {"type": "string"},
                            {"type": "number"},
                            {"type": "array", "items": {"type": "number"}},
                        ]
                    },
                    "description": "Entry object with multiple fields",
                    "title": "EntryCompressedTreeObjectValue",
                },
            ],
            "title": "EntryCompressedTreeValue",
        }

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
            "description": "A compressed tree representation of entries, organized by type (entities/artifacts) and subtype.",
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


class EntryListCompressedTreeSerializer(serializers.BaseSerializer):
    def __init__(self, *args, fields=("name",), **kwargs):
        self.fields = fields
        super().__init__(*args, **kwargs)

    def serialize_entry(self, entry):
        if len(self.fields) == 1:
            return getattr(entry, self.fields[0])

        return {
            field: (
                getattr(entry, field)
                if field != "location"
                else [entry.location.x, entry.location.y]
                if entry.location
                else None
            )
            for field in self.fields
        }

    def add_to_tree(self, tree, entry):
        if entry.entry_class.type == EntryType.ENTITY:
            tree["entities"].setdefault(entry.entry_class.subtype, []).append(
                self.serialize_entry(entry)
            )
        else:
            tree["artifacts"].setdefault(entry.entry_class.subtype, []).append(
                self.serialize_entry(entry)
            )

    def to_representation(self, data):
        tree = {"entities": {}, "artifacts": {}}

        for entry in data:
            self.add_to_tree(tree, entry)

        return tree


class EntryTypesCompressedTreeSerializer(serializers.BaseSerializer):
    def __init__(self, *args, exclude=[], fields=("name",), **kwargs):
        self.fields = fields
        self.exclude = exclude
        super().__init__(*args, **kwargs)

    def to_representation(self, data):
        unique_subtypes = (
            data.filter(~Q(entry_class__subtype__in=self.exclude))
            .values_list("entry_class__subtype", flat=True)
            .distinct()
        )

        return list(unique_subtypes)


class EntryClassSerializerMinimal(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = ["type", "subtype", "color"]


class EntrySerializerMinimal(serializers.ModelSerializer):
    entry_class = EntryClassSerializerMinimal(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation


class ArtifactClassSerializer(serializers.ModelSerializer):
    subtype = serializers.CharField(max_length=20)
    regex = serializers.CharField(max_length=65536, default="")
    options = serializers.CharField(max_length=65536, default="")
    format = serializers.CharField(max_length=20, allow_null=True)

    class Meta:
        model = EntryClass
        fields = ["subtype", "regex", "options", "format"]

    def validate(self, data):
        data["type"] = EntryType.ARTIFACT

        if "regex" not in data:
            data["regex"] = ""

        if "options" not in data:
            data["options"] = ""

        return super().validate(data)

    def create(self, validated_data):
        validated_data["type"] = EntryType.ARTIFACT
        return super().create(validated_data)


class EntryClassSerializerNoChildren(serializers.ModelSerializer):
    format = serializers.CharField(max_length=20, allow_null=True)

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
    children = serializers.PrimaryKeyRelatedField(
        queryset=EntryClass.objects.all(), many=True, write_only=True, required=False
    )
    children_detail = serializers.SerializerMethodField(read_only=True)
    format = serializers.CharField(max_length=20, allow_null=True)

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

    def get_count(self, obj):
        entry_count = Entry.objects.filter(entry_class=obj).values("id")[:101].count()
        entry_count = min(entry_count, 100)
        return entry_count


class NextNameResponseSerializer(serializers.Serializer):
    """Serializer for the next available name response."""

    name = serializers.CharField(
        allow_null=True, help_text="Next available name, or null if class has no prefix"
    )


class EntryResponseSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = entry_class_internal
        return internal


class EntrySerializerExtension(OpenApiSerializerExtension):
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
    entry_class = EntryClassSerializerNoChildren(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        entry_class_internal = {}

        for key in EntryClassSerializerNoChildren.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = entry_class_internal
        return internal


class EntitySerializer(serializers.ModelSerializer):
    entry_class = EntryClassSerializerNoChildren(read_only=True)
    aliases = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), many=True, write_only=True, required=False
    )
    aliases_detail = EntrySerializer(source="aliases", many=True, read_only=True)

    class Meta:
        model = Entry
        fields = [
            "id",
            "name",
            "description",
            "entry_class",
            "aliases",
            "aliases_detail",
        ]

    def exists(self) -> bool:
        if Entry.objects.filter(
            name=self.validated_data["name"],
            entry_class__subtype=self.validated_data["entry_class"].subtype,
        ).exists():
            return True
        return False

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        representation.pop("aliases", None)

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        data["type"] = EntryType.ENTITY

        if "subtype" not in data or not data["subtype"]:
            raise EntryMustHaveASubtype()

        internal = super().to_internal_value(data)
        entryclass = EntryClass.objects.filter(
            type=EntryType.ENTITY, subtype=data["subtype"]
        )

        if not entryclass.exists():
            raise EntryTypeDoesNotExist()

        internal["entry_class"] = entryclass.first()
        return internal

    def validate(self, data):
        """First checks whether there exists another entity with the
            same name, in which entity it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateEntityException
                which returns error code 409.
        """
        entry_class = EntryClass.objects.filter(subtype=data["entry_class"].subtype)

        if not entry_class.exists():
            raise EntryTypeDoesNotExist()

        if entry_class.first().type != EntryType.ENTITY:
            raise EntryTypeMismatchException()

        data["entry_class"] = entry_class.first()

        if not data.get("name"):
            raise serializers.ValidationError("Name is required.")

        # Check if all aliases are artifacts
        # for alias in data.get("aliases", []):
        #     if alias.entry_class.type != EntryType.ARTIFACT:
        #         raise CannotAliasToEntityException()

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
            new_alias_ids = {
                alias.id if hasattr(alias, "id") else alias for alias in aliases_data
            }

            if current_alias_ids != new_alias_ids:
                instance.aliases.set(aliases_data)
                instance.reconnect_aliases()

        return instance


class ArtifactSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default="artifact")

    class Meta:
        model = Entry
        fields = ["name", "subtype"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            if key in representation:
                continue
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        data["type"] = EntryType.ARTIFACT
        entry_class_internal = {}
        for key in EntryClassSerializerNoChildren.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = EntryClass(**entry_class_internal)
        return internal

    def validate(self, data):
        """First checks whether there exists another entity with the
            same name, in which entity it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateEntityException
                which returns error code 409.
        """
        entry_class = EntryClass.objects.filter(subtype=data["entry_class"].subtype)

        if entry_class.exists() and entry_class.first().type != EntryType.ARTIFACT:
            raise EntryTypeMismatchException()

        entry_exists = Entry.objects.filter(
            entry_class=data["entry_class"], name=data["name"]
        ).exists()
        if entry_exists:
            raise DuplicateEntryException()

        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry based on the validated data.
            Also sets the type attribute to "entity" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry

        Returns:
            The created Entry entry
        """
        entry_class_serializer = EntryClassSerializerNoChildren(
            instance=validated_data["entry_class"]
        )
        EntryClass.objects.get_or_create(**entry_class_serializer.data)

        return super().create(validated_data)


class EntryPublishSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "description"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["subtype"] = instance.entry_class.subtype
        return data


class EntityAccessAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ["id", "name"]


class RelationSerializer(serializers.ModelSerializer):
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


class EnricherListSerializer(serializers.Serializer):
    """Serializer for listing enrichers for an entry."""

    name = serializers.CharField()
    id = serializers.IntegerField()


class EnricherRequestSerializer(serializers.Serializer):
    """Serializer for requesting enrichment for an entry."""

    enricher = serializers.IntegerField(required=True)


class EnricherResponseSerializer(serializers.Serializer):
    """Serializer for enrichment response."""

    message = serializers.CharField(required=False)
    error = serializers.CharField(required=False)

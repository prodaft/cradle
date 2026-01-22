from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField

from access.enums import AccessType
from access.exceptions import EntityNotFoundException
from access.models import Access
from core.utils import fields_to_form
from cradle import settings
from entries.enums import EntryType
from entries.models import Entry, EntryClass, Relation
from entries.serializers import (
    EntryClassSerializer,
    EntrySerializer,
    EntrySerializerMinimal,
)
from intelio.enums import EnrichmentStatus
from intelio.models.base import BaseDigest, EnrichmentRequest
from notes.exceptions import NoteDoesNotExistException
from notes.models import Note
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer

from .models import BaseEnricher, EnricherSettings


class DigestSubclassSerializer(serializers.Serializer):
    """Serializer for digest subclass information."""

    class_name = serializers.CharField(source="class", help_text="The class name of the digest")
    name = serializers.CharField(help_text="The display name of the digest")
    infer_entities = serializers.BooleanField(help_text="Whether this digest type can infer entities")

    class Meta:
        ref_name = "DigestSubclass"


class EnrichmentSubclassSerializer(serializers.Serializer):
    """Serializer for enrichment subclass information."""

    class_name = serializers.CharField(source="class", help_text="The class name of the enricher")
    name = serializers.CharField(help_text="The display name of the enricher")
    enabled = serializers.BooleanField(help_text="Whether the enricher is enabled")

    class Meta:
        ref_name = "EnrichmentSubclass"


class MappingSubclassSerializer(serializers.Serializer):
    """Serializer for mapping subclass information."""

    class_name = serializers.CharField(source="class", help_text="The class name of the mapping")
    name = serializers.CharField(help_text="The display name of the mapping")

    class Meta:
        ref_name = "MappingSubclass"


class ClassMappingSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    internal_class = serializers.SerializerMethodField()

    class Meta:
        model = None
        fields = "__all__"

    def get_name(self, obj):
        return getattr(obj, "name", None)

    def get_internal_class(self, obj):
        return obj.internal_class.subtype

    @classmethod
    def get_serializer(cls, subclass):
        """Factory method to create a serializer for any subclass."""

        class DynamicSerializer(cls):
            internal_class = serializers.SerializerMethodField()

            class Meta:
                model = subclass
                fields = [field.name for field in subclass._meta.fields]

        return DynamicSerializer


class EnrichmentSettingsSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    for_eclasses = serializers.PrimaryKeyRelatedField(
        queryset=EntryClass.objects.all(), many=True, write_only=True, required=False
    )
    for_eclasses_detail = EntryClassSerializer(source="for_eclasses", many=True, read_only=True)
    enricher_type = serializers.CharField(read_only=True)

    form_fields = SerializerMethodField()

    class Meta:
        model = EnricherSettings
        fields = [
            "id",
            "enabled",
            "for_eclasses",
            "for_eclasses_detail",
            "enricher_type",
            "settings",
            "display_name",
            "form_fields",
        ]

    @extend_schema_field(serializers.CharField())
    def get_display_name(self, obj):
        config = BaseEnricher.get_subclass(obj.enricher_type)
        return config.display_name if config else obj.enricher_type

    @extend_schema_field(serializers.DictField())
    def get_form_fields(self, obj):
        return fields_to_form(BaseEnricher.get_subclass(obj.enricher_type).settings_fields)

    def create(self, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        settings = EnricherSettings.objects.create(**validated_data)

        settings.for_eclasses.set(for_eclasses_data)
        return settings

    def update(self, instance, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        instance = super().update(instance, validated_data)

        if for_eclasses_data is not None:
            instance.for_eclasses.set(for_eclasses_data)

        return instance


class BaseDigestSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    display_name = serializers.SerializerMethodField()

    entity = serializers.PrimaryKeyRelatedField(queryset=Entry.objects.all(), write_only=True, required=False)
    entity_detail = EntrySerializer(source="entity", read_only=True)

    user = serializers.PrimaryKeyRelatedField(queryset=CradleUser.objects.all(), write_only=True, required=True)
    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)

    class Meta:
        model = BaseDigest
        fields = [
            "id",
            "user",
            "title",
            "user_detail",
            "created_at",
            "status",
            "errors",
            "warnings",
            "digest_type",
            "display_name",
            "entity",
            "entity_detail",
        ]
        read_only_fields = ["id", "created_at", "enricher_type", "display_name"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError("Invalid digest type")

        return super().to_internal_value(data)

    @extend_schema_field(serializers.CharField())
    def get_display_name(self, obj):
        return getattr(obj.__class__, "display_name", obj.__class__.__name__)


#    @extend_schema_field(serializers.IntegerField())
#    def get_num_files(self, obj):
#        return obj.files.count()
#
#    @extend_schema_field(serializers.IntegerField())
#    def get_num_relations(self, obj):
#        return obj.relations.count()
#
#    @extend_schema_field(serializers.IntegerField())
#    def get_num_notes(self, obj):
#        return obj.notes.count()


class BaseDigestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating digests with file upload."""

    file = serializers.FileField(write_only=True, help_text="The file to be processed by the digest")

    entities = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=Entry.objects.all(),
        ),
        required=False,
        help_text="Optional entities to associate with this digest",
    )

    class Meta:
        model = BaseDigest
        fields = ["title", "digest_type", "entities", "file"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError("Invalid digest type")

        return super().to_internal_value(data)

    def create(self, validated_data):
        # Remove file from validated_data as it's handled separately in the view
        validated_data.pop("file", None)
        return super().create(validated_data)


class DigestUploadResponseSerializer(serializers.Serializer):
    """Response serializer for digest upload initiation."""

    upload_id = serializers.UUIDField()
    presigned_url = serializers.CharField()
    object_key = serializers.CharField()
    expires_in = serializers.IntegerField(help_text="Expiration time in seconds")


class DigestUploadFinalizeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for finalizing digest upload (creates digest metadata only).

    The digest file is uploaded directly to storage via presigned URL and must exist
    at BaseDigest.storage_key before finalization.
    """

    entities = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=Entry.objects.all(),
        ),
        required=False,
        help_text="Optional entities to associate with this digest",
    )

    class Meta:
        model = BaseDigest
        fields = ["title", "digest_type", "entities"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError("Invalid digest type")

        return super().to_internal_value(data)


class EnrichmentRequestEnricherMinimal(serializers.Serializer):
    """Serializer for minimal enrichment request enricher information."""

    enricher_type = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    enabled = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)

    @classmethod
    def for_enrichment(cls, request: EnrichmentRequest, enricher_type: str):
        enricher_cls = BaseEnricher.get_subclass(enricher_type)
        enricher_settings = request.enrichers_settings.get(enricher_type=enricher_type)
        if enricher_settings is None:
            raise serializers.ValidationError(f"Enricher type {enricher_type} not found")

        return cls(
            {
                "enricher_type": enricher_type,
                "display_name": enricher_cls.display_name,
                "enabled": enricher_settings.enabled,
                "status": request.enricher_status.get(enricher_type, EnrichmentStatus.WAITING),
            }
        )


class EnrichmentRequestEnricherSerializer(serializers.Serializer):
    """Serializer for enrichment request enricher information."""

    enricher_type = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    enabled = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
    errors = serializers.ListField(read_only=True)
    warnings = serializers.ListField(read_only=True)
    artifacts = serializers.ListField(read_only=True)

    @classmethod
    def for_enrichment(cls, request: EnrichmentRequest, enricher_type: str):
        enricher_cls = BaseEnricher.get_subclass(enricher_type)
        enricher_settings = request.enrichers_settings.get(enricher_type=enricher_type)

        # errors = request.errors.get(enricher_type, [])
        # warnings = request.warnings.get(enricher_type, [])
        errors = []
        warnings = []

        if enricher_settings is None:
            raise serializers.ValidationError(f"Enricher type {enricher_type} not found")

        artifacts = []
        enabled_eclasses = set(enricher_settings.for_eclasses.values_list("subtype", flat=True))

        q = Q()
        artifacts_full = set()
        class_colors = {}
        for req in request.request:
            if req["entry_class"] in enabled_eclasses:
                artifacts_full.add((req["entry_class"], req["name"]))
                q = q | (Q(name=req["name"]) & Q(entry_class__subtype=req["entry_class"]))
                class_colors[req["entry_class"]] = req["color"]

        entries = Entry.objects.filter(q)

        artifacts = []
        for entry in entries:
            artifacts.append(
                {
                    "entry_class": entry.entry_class.subtype,
                    "name": entry.name,
                    "id": entry.id,
                    "color": entry.color,
                    "count": request.relations.filter(Q(e1=entry) | Q(e2=entry)).values("id")[:101].count(),
                }
            )
            artifacts_full.remove((entry.entry_class.subtype, entry.name))

        for entry_class, name in artifacts_full:
            artifacts.append(
                {
                    "entry_class": entry_class,
                    "name": name,
                    "id": 0,
                    "count": 0,
                    "color": class_colors.get(entry_class, "#e66100"),
                }
            )

        return cls(
            {
                "enricher_type": enricher_type,
                "display_name": enricher_cls.display_name,
                "enabled": enricher_settings.enabled,
                "status": request.enricher_status.get(enricher_type, EnrichmentStatus.WAITING),
                "errors": errors,
                "warnings": warnings,
                "artifacts": artifacts,
            }
        )


class EnrichmentRequestListSerializer(serializers.ModelSerializer):
    """Serializer for detailed enrichment request information."""

    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)
    enrichers = serializers.SerializerMethodField(read_only=True)
    ignored_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EnrichmentRequest
        fields = [
            "id",
            "title",
            "ignored_count",
            "created_at",
            "completed_at",
            "status",
            "user_detail",
            "enrichers",
            "request",
        ]
        read_only_fields = fields

    @extend_schema_field(EnrichmentRequestEnricherMinimal(many=True))
    def get_enrichers(self, obj: EnrichmentRequest):
        """Return detailed information about each enricher"""
        return [
            EnrichmentRequestEnricherMinimal.for_enrichment(obj, e.enricher_type).data
            for e in obj.enrichers_settings.all()
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_ignored_count(self, obj: EnrichmentRequest):
        """Return the number of ignored artifacts"""
        return len(obj.ignored)


class EnrichmentRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed enrichment request information."""

    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)
    enrichers = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EnrichmentRequest
        fields = [
            "id",
            "title",
            "ignored",
            "created_at",
            "completed_at",
            "status",
            "user_detail",
            "enrichers",
            "request",
        ]
        read_only_fields = fields

    @extend_schema_field(EnrichmentRequestEnricherMinimal(many=True))
    def get_enrichers(self, obj: EnrichmentRequest):
        """Return detailed information about each enricher"""
        return [
            EnrichmentRequestEnricherMinimal.for_enrichment(obj, e.enricher_type).data
            for e in obj.enrichers_settings.all()
        ]


class EnrichmentRequestSerializer(serializers.ModelSerializer):
    """Serializer for enrichment requests."""

    # Input: allow multiple enricher names
    enricher_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        help_text="The names of the enrichers to use for this request",
    )

    # Return IDs of all enrichment settings
    enrichment_settings = serializers.SerializerMethodField(
        read_only=True, help_text="The enrichment settings used for this request"
    )

    # ManyToMany entities
    entities = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), many=True, help_text="The entities to enrich"
    )

    user = serializers.PrimaryKeyRelatedField(read_only=True, help_text="The user who created the request")

    # Read-only details
    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)
    entities_detail = EntrySerializer(source="entities", many=True, read_only=True)

    # Return classes and display names for all enrichers
    enricher_classes = serializers.SerializerMethodField(read_only=True)
    enricher_names_display = serializers.SerializerMethodField(read_only=True)
    request = serializers.ListField(default=[], required=False)
    notes = serializers.ListSerializer(
        write_only=True,
        child=serializers.PrimaryKeyRelatedField(queryset=Note.objects.all()),
    )

    class Meta:
        model = EnrichmentRequest
        fields = [
            "id",
            "notes",
            "title",
            "created_at",
            "completed_at",
            "status",
            "user",
            "user_detail",
            "entities",
            "entities_detail",
            "enricher_names",  # write-only input field
            "enrichment_settings",
            "enricher_classes",
            "enricher_names_display",
            "request",
            "errors",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "completed_at",
            "user",
            "status",
            "errors",
            "enrichment_settings",
            "enricher_classes",
            "enricher_names_display",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_enrichment_settings(self, obj):
        """Return a list of enrichment_settings IDs"""
        return list(obj.enrichers_settings.values_list("id", flat=True))

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_enricher_classes(self, obj):
        """Return the class names of all enrichers"""
        return list(obj.enrichers_settings.values_list("enricher_type", flat=True))

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_enricher_names_display(self, obj):
        """Return the display names of all enrichers"""
        names = []
        for setting in obj.enrichers_settings.all():
            config = BaseEnricher.get_subclass(setting.enricher_type)
            names.append(config.display_name if config else setting.enricher_type)
        return names

    def validate_enricher_names(self, values):
        """Validate multiple enricher names"""
        validated = set()
        validated_names = set()

        for value in values:
            if value in validated_names:
                raise serializers.ValidationError(f"Duplicate enricher name: {value}")

            enricher = EnricherSettings.objects.get(enricher_type=value, enabled=True)
            if not enricher:
                raise serializers.ValidationError(f"Unknown or disabled enricher: {value}")

            validated.add(enricher)
            validated_names.add(value)

        if not validated:
            raise serializers.ValidationError("At least one enricher must be selected")

        return list(validated)

    def validate_entities(self, values):
        """Validate multiple entity IDs"""
        user = self.context["request"].user
        values = set(values)

        if not Access.objects.has_access_to_entities(user, values, {AccessType.READ_WRITE}):
            raise EntityNotFoundException("You don't have access to all the entities")

        return list(values)

    def validate_notes(self, values):
        """Validate multiple note IDs"""
        user = self.context["request"].user

        for note in values:
            if not note.has_access(user):
                raise NoteDoesNotExistException(
                    "One or more of the notes you selected do not exist or you don't have access to them"
                )

        return list(values)

    def validate(self, data):
        """Validate the request"""
        data = super().validate(data)

        if not data.get("request") and not data.get("notes"):
            raise ValidationError({"request": "Request or notes must be provided"})

        additional_request = []
        entities = set(data.get("entities"))

        for note in data.get("notes", []):
            for e in note.entries.all():
                if e.entry_class.type == EntryType.ENTITY:
                    entities.add(e.id)
                elif e.entry_class.subtype not in settings.INTERNAL_SUBTYPES:
                    additional_request.append(
                        {
                            "entry_class": e.entry_class.subtype,
                            "name": e.name,
                        }
                    )

        data["entities"] = list(entities)
        data["request"] = data.get("request", []) + additional_request
        data.pop("notes", None)
        return data

    def create(self, validated_data):
        enrichers = validated_data.pop("enricher_names", [])
        entities = validated_data.pop("entities", [])
        validated_data["user"] = self.context["request"].user

        instance = super().create(validated_data)

        for enricher in enrichers:
            instance.enrichers_settings.add(enricher)

        for value in entities:
            instance.entities.add(value)

        ## on_commit start_enrichment
        transaction.on_commit(lambda: instance.start_enrichment())

        return instance


class EnrichmentRelationSerializer(serializers.ModelSerializer):
    """Serializer for relations created by enrichment requests.

    This is a separate serializer to avoid naming conflicts with the main RelationSerializer
    when generating OpenAPI schema pagination wrappers.
    """

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
        ref_name = "EnrichmentRelation"

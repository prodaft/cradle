"""Serializers for intelio API: digests, enrichment, and mappings."""

from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField

from access.enums import AccessType
from access.models import Access
from core.exceptions import PermissionDeniedException
from core.utils import fields_to_form
from cradle.settings_common import INTERNAL_SUBTYPES
from entries.enums import EntryType
from entries.models import Entry, EntryClass, Relation
from entries.serializers import (
    EntryClassSerializer,
    EntrySerializer,
    EntrySerializerMinimal,
)
from notes.exceptions import NoteNotFoundException
from notes.models import Note
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer

from .enums import EnrichmentStatus
from .models import BaseEnricher, EnricherSettings
from .models.base import BaseDigest, EnrichmentRequest


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

    class Meta:
        model = None
        fields = "__all__"

    def get_name(self, obj):
        return getattr(obj, "name", None)

    @classmethod
    def get_serializer(cls, subclass):
        """Factory method to create a serializer for any subclass."""

        class DynamicSerializer(cls):
            internal_class = serializers.SlugRelatedField(
                slug_field="subtype",
                queryset=EntryClass.objects.all(),
                required=False,
            )

            class Meta:
                model = subclass
                fields = [field.name for field in subclass._meta.fields]

        return DynamicSerializer


class EnrichmentSettingsSerializer(serializers.ModelSerializer):
    """Serializer for enricher configuration (settings, enabled, for_eclasses)."""

    display_name = serializers.SerializerMethodField()
    for_eclasses = serializers.PrimaryKeyRelatedField(
        queryset=EntryClass.objects.all(),
        many=True,
        write_only=True,
        required=False,
        help_text="Entry class IDs this enricher applies to",
    )
    for_eclasses_detail = EntryClassSerializer(source="for_eclasses", many=True, read_only=True)
    enricher_type = serializers.CharField(
        read_only=True, help_text="Stable identifier for this enrichment implementation"
    )
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
        return BaseEnricher.display_label_for_type(obj.enricher_type)

    @extend_schema_field(serializers.DictField())
    def get_form_fields(self, obj):
        config = BaseEnricher.get_subclass(obj.enricher_type)
        return fields_to_form(config.settings_fields) if config else {}

    def create(self, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        settings = EnricherSettings.objects.create(**validated_data)

        settings.for_eclasses.set(for_eclasses_data)
        return settings

    def update(self, instance, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        instance = super().update(instance, validated_data)

        instance.for_eclasses.set(for_eclasses_data)

        return instance


class BaseDigestSerializer(serializers.ModelSerializer):
    """Serializer for digest list/detail. Includes entity and user details."""

    id = serializers.UUIDField(read_only=True)
    display_name = serializers.SerializerMethodField()
    entity = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.none(), write_only=True, required=False, help_text="Optional entity to associate"
    )
    entity_detail = EntrySerializer(source="entity", read_only=True)
    user = serializers.PrimaryKeyRelatedField(
        queryset=CradleUser.objects.all(), write_only=True, required=True, help_text="User who owns the digest"
    )
    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user:
            self.fields["entity"].queryset = Entry.objects.accessible(request.user)

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
        read_only_fields = ["id", "created_at", "display_name"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError({"digest_type": "That digest format is not supported."})

        return super().to_internal_value(data)

    @extend_schema_field(serializers.CharField())
    def get_display_name(self, obj):
        return getattr(obj.__class__, "display_name", obj.__class__.__name__)


class BaseDigestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating digests with file upload."""

    file = serializers.FileField(write_only=True, help_text="The file to be processed by the digest")

    entities = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Entry.objects.none()),
        required=False,
        help_text="Optional entities to associate with this digest",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user:
            self.fields["entities"].child.queryset = Entry.objects.accessible(request.user)

    class Meta:
        model = BaseDigest
        fields = ["title", "digest_type", "entities", "file"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError({"digest_type": "That digest format is not supported."})

        return super().to_internal_value(data)

    def create(self, validated_data):
        # Remove file from validated_data as it's handled separately in the view
        validated_data.pop("file", None)
        return super().create(validated_data)


class DigestUploadResponseSerializer(serializers.Serializer):
    """Response serializer for digest upload initiation."""

    upload_id = serializers.UUIDField(help_text="UUID for this upload session")
    presigned_url = serializers.CharField(help_text="URL to upload the file to")
    object_key = serializers.CharField(help_text="S3 object key for the uploaded file")
    expires_in = serializers.IntegerField(help_text="Expiration time in seconds")


class DigestUploadFinalizeCreateSerializer(serializers.ModelSerializer):
    """Serializer for finalizing digest upload (creates digest metadata only).

    The digest file is uploaded directly to storage via presigned URL and must exist
    at BaseDigest.storage_key before finalization.
    """

    entities = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Entry.objects.none()),
        required=False,
        help_text="Optional entities to associate with this digest",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user:
            self.fields["entities"].child.queryset = Entry.objects.accessible(request.user)

    class Meta:
        model = BaseDigest
        fields = ["title", "digest_type", "entities"]

    def to_internal_value(self, data):
        self.Meta.model = BaseDigest.get_subclass(data["digest_type"])

        if self.Meta.model is None:
            raise serializers.ValidationError({"digest_type": "That digest format is not supported."})

        return super().to_internal_value(data)


class EnrichmentRequestEnricherMinimal(serializers.Serializer):
    """Serializer for minimal enrichment request enricher information."""

    enricher_type = serializers.CharField(
        read_only=True, help_text="Stable identifier for this enrichment implementation"
    )
    display_name = serializers.CharField(read_only=True, help_text="Display name for this enrichment")
    enabled = serializers.BooleanField(read_only=True, help_text="Whether this enrichment is enabled")
    status = serializers.CharField(read_only=True, help_text="Status for this enrichment on the request")

    @classmethod
    def for_enrichment(cls, request: EnrichmentRequest, enricher_type: str):
        enricher_settings = request.enrichers_settings.get(enricher_type=enricher_type)
        if enricher_settings is None:
            raise serializers.ValidationError("That enrichment is not available.")

        return cls(
            {
                "enricher_type": enricher_type,
                "display_name": BaseEnricher.display_label_for_type(enricher_type),
                "enabled": enricher_settings.enabled,
                "status": request.enricher_status.get(enricher_type, EnrichmentStatus.WAITING),
            }
        )


class EnrichmentRequestEnricherSerializer(serializers.Serializer):
    """Serializer for enrichment request enricher information including artifacts."""

    enricher_type = serializers.CharField(
        read_only=True, help_text="Stable identifier for this enrichment implementation"
    )
    display_name = serializers.CharField(read_only=True, help_text="Display name for this enrichment")
    enabled = serializers.BooleanField(read_only=True, help_text="Whether this enrichment is enabled")
    status = serializers.CharField(read_only=True, help_text="Status for this enrichment on the request")
    errors = serializers.ListField(read_only=True, help_text="Errors from this enrichment")
    warnings = serializers.ListField(read_only=True, help_text="Warnings from this enrichment")
    artifacts = serializers.ListField(read_only=True, help_text="Artifacts produced by this enrichment")

    @classmethod
    def for_enrichment(cls, request: EnrichmentRequest, enricher_type: str):
        enricher_settings = request.enrichers_settings.get(enricher_type=enricher_type)
        errors = []
        warnings = []

        if enricher_settings is None:
            raise serializers.ValidationError("That enrichment is not available.")

        enabled_eclasses = set(enricher_settings.for_eclasses.values_list("subtype", flat=True))

        q = Q()
        artifacts_full = set()
        class_colors = {}
        art = request.artifact if isinstance(request.artifact, dict) else {}
        subtype, name = art.get("entry_class"), art.get("name")
        if subtype and name is not None and name != "" and subtype in enabled_eclasses:
            artifacts_full.add((subtype, name))
            q = Q(name=name) & Q(entry_class__subtype=subtype)
            if subtype not in class_colors:
                class_colors[subtype] = EntryClass.objects.get(subtype=subtype).color

        entries = Entry.objects.filter(q)

        artifacts = []
        for entry in entries:
            artifacts.append(
                {
                    "subtype": entry.entry_class.subtype,
                    "name": entry.name,
                    "id": entry.id,
                    "color": class_colors.get(entry.entry_class.subtype, "#e66100"),
                    "count": request.relations.filter(Q(e1=entry) | Q(e2=entry)).values("id")[:101].count(),
                }
            )
            artifacts_full.remove((entry.entry_class.subtype, entry.name))

        for entry_class, name in artifacts_full:
            artifacts.append(
                {
                    "subtype": entry_class,
                    "name": name,
                    "id": 0,
                    "count": 0,
                    "color": class_colors.get(entry_class, "#e66100"),
                }
            )

        return cls(
            {
                "enricher_type": enricher_type,
                "display_name": BaseEnricher.display_label_for_type(enricher_type),
                "enabled": enricher_settings.enabled,
                "status": request.enricher_status.get(enricher_type, EnrichmentStatus.WAITING),
                "errors": errors,
                "warnings": warnings,
                "artifacts": artifacts,
            }
        )


class EnrichmentRequestListSerializer(serializers.ModelSerializer):
    """Serializer for enrichment request list items (summary view)."""

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
            "artifact",
        ]
        read_only_fields = fields

    @extend_schema_field(EnrichmentRequestEnricherMinimal(many=True))
    def get_enrichers(self, obj: EnrichmentRequest):
        """Return detailed information about each enricher."""
        return [
            EnrichmentRequestEnricherMinimal.for_enrichment(obj, e.enricher_type).data
            for e in obj.enrichers_settings.all()
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_ignored_count(self, obj: EnrichmentRequest):
        """Return the number of ignored artifacts."""
        return len(obj.ignored)


class EnrichmentRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for full enrichment request detail including ignored items."""

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
            "artifact",
        ]
        read_only_fields = fields

    @extend_schema_field(EnrichmentRequestEnricherMinimal(many=True))
    def get_enrichers(self, obj: EnrichmentRequest):
        """Return detailed information about each enricher."""
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

    # ManyToMany entities (optional; scopes who can see the request when set)
    entities = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.none(),
        many=True,
        required=False,
        allow_empty=True,
        help_text="Optional entity IDs for access control",
    )

    user = serializers.PrimaryKeyRelatedField(read_only=True, help_text="The user who created the request")

    # Read-only details
    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)
    entities_detail = EntrySerializer(source="entities", many=True, read_only=True)

    # Return classes and display names for all enrichers
    enricher_classes = serializers.SerializerMethodField(read_only=True)
    enricher_names_display = serializers.SerializerMethodField(read_only=True)
    artifact = serializers.JSONField(
        required=False,
        help_text='Single artifact {"entry_class": subtype, "name": value}',
    )
    notes = serializers.ListSerializer(
        write_only=True,
        child=serializers.PrimaryKeyRelatedField(queryset=Note.objects.none()),
        required=False,
        default=list,
        help_text="Note IDs; entries from selected notes must yield exactly one enrichable artifact combined with `artifact`",
    )
    errors = serializers.SerializerMethodField(
        read_only=True,
        help_text="Error messages grouped by enrichment name (not internal identifiers)",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user:
            user = request.user
            if user.is_cradle_admin:
                self.fields["entities"].queryset = Entry.entities.all()
            else:
                self.fields["entities"].queryset = Entry.entities.filter(
                    id__in=Access.objects.get_accessible_entity_ids(user.id)
                )
            self.fields["notes"].child.queryset = Note.objects.get_accessible_notes(user)

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
            "artifact",
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
        """Return a list of enrichment_settings IDs."""
        return list(obj.enrichers_settings.values_list("id", flat=True))

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_enricher_classes(self, obj):
        """Return the class names of all enrichers."""
        return list(obj.enrichers_settings.values_list("enricher_type", flat=True))

    @extend_schema_field(serializers.DictField(child=serializers.ListField(child=serializers.CharField())))
    def get_errors(self, obj: EnrichmentRequest):
        """Expose errors with display labels instead of Python class names as keys."""
        return BaseEnricher.enricher_messages_for_ui(obj.errors)

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_enricher_names_display(self, obj):
        """Return the display names of all enrichers (never raw Python class names)."""
        return [BaseEnricher.display_label_for_type(s.enricher_type) for s in obj.enrichers_settings.all()]

    def validate_enricher_names(self, values):
        """Validate multiple enricher names."""
        validated = set()
        validated_names = set()

        for value in values:
            if value in validated_names:
                raise serializers.ValidationError("That enrichment is already selected.")

            try:
                enricher = EnricherSettings.objects.get(enricher_type=value, enabled=True)
            except EnricherSettings.DoesNotExist:
                raise serializers.ValidationError("That enrichment is not available.")

            validated.add(enricher)
            validated_names.add(value)

        if not validated:
            raise serializers.ValidationError("Select at least one enrichment.")

        return list(validated)

    def validate_entities(self, values):
        """Validate multiple entity IDs."""
        user = self.context["request"].user
        values = set(values or [])
        if not values:
            return []

        if not Access.objects.has_access_to_entities(user, values, {AccessType.READ_WRITE}):
            raise PermissionDeniedException(detail="You do not have access to one or more of the selected entities.")

        return list(values)

    def validate_notes(self, values):
        """Validate multiple note IDs."""
        user = self.context["request"].user

        for note in values:
            if not note.has_access(user):
                raise NoteNotFoundException(detail="Some of the selected notes could not be found.")

        return list(values)

    def validate(self, data):
        """Validate the request."""
        data = super().validate(data)

        if not data.get("artifact") and not data.get("notes"):
            raise serializers.ValidationError(
                "Provide one artifact, or choose notes that contribute exactly one enrichable artifact."
            )

        combined: list[dict] = []
        raw_artifact = data.get("artifact")
        if raw_artifact is not None:
            if isinstance(raw_artifact, list):
                raise serializers.ValidationError(
                    {"artifact": 'Use a single object with "entry_class" and "name", not a list.'}
                )
            if not isinstance(raw_artifact, dict):
                raise serializers.ValidationError({"artifact": "Artifact must be a JSON object."})
            combined.append(raw_artifact)

        entities = set(data.get("entities") or [])

        for note in data.get("notes") or []:
            for e in note.entries.all():
                if e.entry_class.type == EntryType.ENTITY:
                    entities.add(e.id)
                elif e.entry_class.subtype not in INTERNAL_SUBTYPES:
                    combined.append(
                        {
                            "entry_class": e.entry_class.subtype,
                            "name": e.name,
                        }
                    )

        data["entities"] = list(entities)

        if len(combined) != 1:
            raise serializers.ValidationError(
                "Exactly one artifact is allowed per enrichment request. "
                "Specify one `artifact` object and/or notes that add up to a single enrichable entry."
            )

        data["artifact"] = combined[0]
        data["enrichers_settings"] = data.pop("enricher_names", [])
        data.pop("notes", None)

        return data

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user

        instance = super().create(validated_data)

        # on_commit start_enrichment
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

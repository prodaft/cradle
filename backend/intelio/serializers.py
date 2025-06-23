from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from drf_spectacular.utils import extend_schema_field

from entries.models import Entry, EntryClass
from entries.serializers import EntryClassSerializer, EntrySerializer
from intelio.models.base import BaseDigest
from core.utils import fields_to_form
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer
from .models import EnricherSettings, BaseEnricher


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
    for_eclasses_detail = EntryClassSerializer(
        source="for_eclasses", many=True, read_only=True
    )

    form_fields = SerializerMethodField()

    class Meta:
        model = EnricherSettings
        fields = [
            "id",
            "strategy",
            "enabled",
            "periodicity",
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
        return fields_to_form(
            BaseEnricher.get_subclass(obj.enricher_type).settings_fields
        )

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

    entity = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), write_only=True, required=False
    )
    entity_detail = EntrySerializer(source="entity", read_only=True)

    user = serializers.PrimaryKeyRelatedField(
        queryset=CradleUser.objects.all(), write_only=True, required=True
    )
    user_detail = EssentialUserRetrieveSerializer(source="user", read_only=True)

    num_files = serializers.SerializerMethodField()
    num_relations = serializers.SerializerMethodField()
    num_notes = serializers.SerializerMethodField()

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
            "num_files",
            "num_relations",
            "num_notes",
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

    @extend_schema_field(serializers.IntegerField())
    def get_num_files(self, obj):
        return obj.files.count()

    @extend_schema_field(serializers.IntegerField())
    def get_num_relations(self, obj):
        return obj.relations.count()

    @extend_schema_field(serializers.IntegerField())
    def get_num_notes(self, obj):
        return obj.notes.count()

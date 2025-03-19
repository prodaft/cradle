from rest_framework import serializers
from rest_framework.fields import SerializerMethodField

from entries.models import EntryClass
from entries.serializers import EntryClassSerializer
from intelio.utils import fields_to_form
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
            "periodicity",
            "for_eclasses",
            "for_eclasses_detail",
            "enricher_type",
            "settings",
            "display_name",
            "form_fields",
        ]

    def get_display_name(self, obj):
        config = BaseEnricher.get_subclass(obj.enricher_type)
        return config.display_name if config else obj.enricher_type

    def get_form_fields(self, obj):
        return fields_to_form(
            BaseEnricher.get_subclass(obj.enricher_type).settings_fields
        )

    def create(self, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        settings = EnricherSettings.objects.create(**validated_data)

        print(for_eclasses_data)
        settings.for_eclasses.set(for_eclasses_data)
        return settings

    def update(self, instance, validated_data):
        for_eclasses_data = validated_data.pop("for_eclasses", [])
        print(for_eclasses_data)
        instance = super().update(instance, validated_data)

        if for_eclasses_data is not None:
            instance.for_eclasses.set(for_eclasses_data)

        return instance

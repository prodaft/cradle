from rest_framework import serializers


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

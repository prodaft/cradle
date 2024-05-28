from entities.enums import EntrySubtype, EntityType
from rest_framework import serializers


class EntityQuerySerializer(serializers.Serializer):
    name = serializers.CharField(required=False, default="")
    entityType = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                # exclude metadata from the list of choices
                choice
                for choice in EntityType.choices
                if choice[0] != EntityType.METADATA
            ]
        ),
        required=False,
        # exclude metadata from the list of values
        default=[value for value in EntityType.values if value != "metadata"],
    )
    entitySubtype = serializers.ListField(
        child=serializers.ChoiceField(choices=EntrySubtype.choices),
        required=False,
        default=EntrySubtype.values,
    )

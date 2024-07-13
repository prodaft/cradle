from entries.enums import EntryType
from rest_framework import serializers


class EntryQuerySerializer(serializers.Serializer):
    name = serializers.CharField(required=False, default="")
    entryType = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                # exclude metadata from the list of choices
                choice
                for choice in EntryType.choices
            ]
        ),
        required=False,
        # exclude metadata from the list of values
        default=[value for value in EntryType.values if value != "metadata"],
    )
    entrySubtype = serializers.ListField(
        # child=serializers.ChoiceField(choices=ArtifactSubtype.choices),
        required=False,
        default=[]
    )

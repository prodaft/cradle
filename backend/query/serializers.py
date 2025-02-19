from entries.enums import EntryType
from rest_framework import serializers

from entries.models import EntryClass


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
        default=[value for value in EntryType.values],
    )
    entrySubtype = serializers.ListField(
        # child=serializers.ChoiceField(choices=ArtifactSubtype.choices),
        required=False,
    )

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

    def validate(self, data):
        if len(data.get("entrySubtype", [])) == 0:
            data["entrySubtype"] = [x.subtype for x in EntryClass.objects.all()]

        return super().validate(data)

from rest_framework import serializers


class FleetingNoteFinalRequestSerializer(serializers.Serializer):
    """Serializer for converting a fleeting note to a regular note."""

    publishable = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Whether the converted note should be publishable. Defaults to False.",
    )

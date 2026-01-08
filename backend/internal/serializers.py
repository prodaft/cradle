from django.db import models
from rest_framework import serializers


class CollabAccessLevel(models.TextChoices):
    NONE = "NONE", "None"
    READ = "READ", "Read"
    READWRITE = "READWRITE", "ReadWrite"


class CollabAuthorizeRequestSerializer(serializers.Serializer):
    note_id = serializers.UUIDField()
    user_token = serializers.CharField()


class CollabAuthorizeResponseSerializer(serializers.Serializer):
    access = serializers.ChoiceField(choices=CollabAccessLevel.choices)
    user_id = serializers.UUIDField(required=False, allow_null=True)
    username = serializers.CharField(required=False, allow_null=True)


class CollabNoteApplyRequestSerializer(serializers.Serializer):
    content = serializers.CharField()
    user_id = serializers.UUIDField()

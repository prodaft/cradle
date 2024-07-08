from rest_framework import serializers
from .models import Entry
from .exceptions import (
    DuplicateActorException,
    DuplicateCaseException,
    DuplicateArtifactException,
)


class EntryResponseSerializer(serializers.ModelSerializer):

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "type", "subtype"]


class ActorSerializer(serializers.ModelSerializer):

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["name", "description"]

    def validate(self, data):
        """First checks whether there exists another actor with the
            same name, in which case it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateActorException
                which returns error code 409.
        """

        actor_exists = Entry.actors.filter(name=data["name"]).exists()
        if actor_exists:
            raise DuplicateActorException()
        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry entry based on the validated data.
            Also sets the type attribute to "actor" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            The created Entry entry
        """

        validated_data["type"] = "actor"
        return super().create(validated_data)


class CaseSerializer(serializers.ModelSerializer):

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["name", "description"]

    def validate(self, data):
        """First checks whether there exists another case with the
            same name, in which case it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateCaseException
                which returns error code 409.
        """

        case_exists = Entry.cases.filter(name=data["name"]).exists()
        if case_exists:
            raise DuplicateCaseException()
        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry entry based on the validated data.
            Also sets the type attribute to "case" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            The created Entry entry
        """

        validated_data["type"] = "case"
        return super().create(validated_data)


class CaseAccessAdminSerializer(serializers.ModelSerializer):

    class Meta:
        model = Entry
        fields = ["id", "name"]


class ArtifactSerializer(serializers.ModelSerializer):

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["name", "description", "subtype"]

    def validate(self, data):
        """First checks whether there exists another artifact with the
            same name and subtype, in which case it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateArtifactException
                which returns error code 409.
        """

        artifact_exists = Entry.artifacts.filter(
            name=data["name"], subtype=data["subtype"]
        ).exists()
        if artifact_exists:
            raise DuplicateArtifactException()
        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry entry based on the validated data.
            Also sets the type attribute to "artifact" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            The created Entry entry
        """

        validated_data["type"] = "artifact"
        return super().create(validated_data)


class MetadataSerializer(serializers.ModelSerializer):

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["name", "description", "subtype"]

    def create(self, validated_data):
        """Creates a new Entry entry based on the validated data.
            Also sets the type attribute to "metadata" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            The created Entry entry
        """
        validated_data["type"] = "metadata"
        return super().create(validated_data)


class EntrySerializer(serializers.ModelSerializer):

    class Meta:
        model = Entry
        fields = ["id", "name", "type", "subtype"]

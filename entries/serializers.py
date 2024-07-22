from rest_framework import serializers
from .models import Entry, EntryClass
from .enums import EntryType
from typing import Any, Dict

from .exceptions import (
    DuplicateEntryException,
    EntryTypeMismatchException,
)

class ArtifactClassSerializer(serializers.ModelSerializer):
    subtype = serializers.CharField(max_length=20)
    regex = serializers.CharField(max_length=512, default='')
    options = serializers.CharField(max_length=65536, default='')

    class Meta:
        model = EntryClass
        fields = ['subtype', 'regex', 'options']

    def validate(self, data):
        data["type"] = EntryType.ARTIFACT

        if "regex" not in data:
            data["regex"] = ''

        if "options" not in data:
            data["options"] = ''

        return super().validate(data)

    def create(self, validated_data):
        validated_data["type"] = EntryType.ARTIFACT
        return super().create(validated_data)

class EntryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = ['type', 'subtype', 'regex', 'options']

class EntryResponseSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop('entry_class')

        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal['entry_class'] = entry_class_internal
        return internal


class EntitySerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ['name', 'description', 'entry_class']

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop('entry_class')
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        data["type"] = EntryType.ENTITY
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal['entry_class'] = EntryClass(**entry_class_internal)
        return internal

    def validate(self, data):
        """First checks whether there exists another entity with the
            same name, in which entity it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateEntityException
                which returns error code 409.
        """
        entry_class = EntryClass.objects.filter(subtype=data["entry_class"].subtype)

        if entry_class.exists() and entry_class.first().type != EntryType.ENTITY:
            raise EntryTypeMismatchException()


        entry_exists = Entry.objects.filter(entry_class=data["entry_class"], name=data["name"]).exists()
        if entry_exists:
            raise DuplicateEntryException()


        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry based on the validated data.
            Also sets the type attribute to "entity" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry

        Returns:
            The created Entry entry
        """
        entry_class_serializer = EntryClassSerializer(instance=validated_data["entry_class"])
        EntryClass.objects.get_or_create(**entry_class_serializer.data)

        return super().create(validated_data)

class ArtifactSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default='artifact')

    class Meta:
        model = Entry
        fields = ["name", "subtype"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop('entry_class')
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        data["type"] = EntryType.ARTIFACT
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal['entry_class'] = EntryClass(**entry_class_internal)
        return internal

    def validate(self, data):
        """First checks whether there exists another entity with the
            same name, in which entity it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the Entry entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateEntityException
                which returns error code 409.
        """
        entry_class = EntryClass.objects.filter(subtype=data["entry_class"].subtype)

        if entry_class.exists() and entry_class.first().type != EntryType.ARTIFACT:
            raise EntryTypeMismatchException()


        entry_exists = Entry.objects.filter(entry_class=data["entry_class"], name=data["name"]).exists()
        if entry_exists:
            raise DuplicateEntryException()


        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Entry based on the validated data.
            Also sets the type attribute to "entity" before creating the entry.

        Args:
            validated_data: a dictionary containing the attributes of
                the Entry

        Returns:
            The created Entry entry
        """
        entry_class_serializer = EntryClassSerializer(instance=validated_data["entry_class"])
        EntryClass.objects.get_or_create(**entry_class_serializer.data)

        return super().create(validated_data)



class EntrySerializer(serializers.ModelSerializer):
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop('entry_class')
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        entry_class_internal = {}
        for key in EntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal['entry_class'] = entry_class_internal
        return internal


class EntityAccessAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ["id", "name"]


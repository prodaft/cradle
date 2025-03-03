from rest_framework import serializers
from .models import Entry, EntryClass
from .enums import EntryType

from django.db.models.functions import Length

from .exceptions import (
    DuplicateEntryException,
    EntryTypeMismatchException,
    EntryMustHaveASubtype,
    EntryTypeDoesNotExist,
)


class EntryListCompressedTreeSerializer(serializers.BaseSerializer):
    def __init__(self, *args, fields=("name",), **kwargs):
        self.fields = fields
        super().__init__(*args, **kwargs)

    def serialize_entry(self, entry):
        if len(self.fields) == 1:
            return getattr(entry, self.fields[0])

        return {field: getattr(entry, field) for field in self.fields}

    def add_to_tree(self, tree, entry):
        if entry.entry_class.type == EntryType.ENTITY:
            tree["entities"].setdefault(entry.entry_class.subtype, []).append(
                self.serialize_entry(entry)
            )
        else:
            tree["artifacts"].setdefault(entry.entry_class.subtype, []).append(
                self.serialize_entry(entry)
            )

    def to_representation(self, data):
        tree = {"entities": {}, "artifacts": {}}

        for entry in data.all():
            self.add_to_tree(tree, entry)

        return tree


class EntryTypesCompressedTreeSerializer(serializers.BaseSerializer):
    def __init__(self, *args, fields=("name",), **kwargs):
        self.fields = fields
        super().__init__(*args, **kwargs)

    def to_representation(self, data):
        unique_subtypes = data.values_list("entry_class__subtype", flat=True).distinct()

        return list(unique_subtypes)


class ArtifactClassSerializer(serializers.ModelSerializer):
    subtype = serializers.CharField(max_length=20)
    regex = serializers.CharField(max_length=65536, default="")
    options = serializers.CharField(max_length=65536, default="")

    class Meta:
        model = EntryClass
        fields = ["subtype", "regex", "options", "catalyst_type"]

    def validate(self, data):
        data["type"] = EntryType.ARTIFACT

        if "regex" not in data:
            data["regex"] = ""

        if "options" not in data:
            data["options"] = ""

        return super().validate(data)

    def create(self, validated_data):
        validated_data["type"] = EntryType.ARTIFACT
        return super().create(validated_data)


class EntryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "generative_regex",
            "regex",
            "options",
            "prefix",
            "color",
            "catalyst_type",
        ]


class EntryResponseSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

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
        internal["entry_class"] = entry_class_internal
        return internal


class EntitySerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)
    entry_class = EntryClassSerializer(read_only=True)
    name = serializers.CharField(max_length=255, allow_blank=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "description", "entry_class"]

    def __init__(self, *args, autoname=False, **kwargs):
        self.autoname = autoname
        super().__init__(*args, **kwargs)

    def exists(self) -> bool:
        if Entry.objects.filter(
            name=self.validated_data["name"],
            entry_class__subtype=self.validated_data["entry_class"].subtype,
        ).exists():
            return True
        return False

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")
        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        data["type"] = EntryType.ENTITY

        if "subtype" not in data or not data["subtype"]:
            raise EntryMustHaveASubtype()

        for i in data:  # For lists in querydict
            if isinstance(data[i], list):
                data[i] = data[i][0]

        internal = super().to_internal_value(data)
        entryclass = EntryClass.objects.filter(
            type=EntryType.ENTITY, subtype=data["subtype"]
        )

        if not entryclass.exists():
            raise EntryTypeDoesNotExist()

        internal["entry_class"] = entryclass.first()
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

        if not entry_class.exists():
            raise EntryTypeDoesNotExist()

        if entry_class.first().type != EntryType.ENTITY:
            raise EntryTypeMismatchException()

        data["entry_class"] = entry_class.first()

        if self.autoname:
            self.autoassign_name(data)

        if not data.get("name"):
            raise serializers.ValidationError("Name is required.")

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
        return super().create(validated_data)

    def autoassign_name(self, data):
        if data.get("name"):
            return

        prefix = data["entry_class"].prefix

        if not prefix:
            return

        all_entries = Entry.objects.filter(
            entry_class__subtype=data["entry_class"].subtype
        )

        if not all_entries.exists():
            data["name"] = f"{prefix}1"
            return

        max_entry = (
            all_entries.annotate(name_length=Length("name"))
            .order_by("-name_length", "-name")
            .first()
        )

        max_number = int(max_entry.name[len(prefix) :])
        data["name"] = f"{prefix}{max_number + 1}"
        return


class ArtifactSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default="artifact")

    class Meta:
        model = Entry
        fields = ["name", "subtype"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")
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
        internal["entry_class"] = EntryClass(**entry_class_internal)
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

        entry_exists = Entry.objects.filter(
            entry_class=data["entry_class"], name=data["name"]
        ).exists()
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
        entry_class_serializer = EntryClassSerializer(
            instance=validated_data["entry_class"]
        )
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
        entry_class_repr = representation.pop("entry_class")
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
        internal["entry_class"] = entry_class_internal
        return internal


class EntityAccessAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ["id", "name"]

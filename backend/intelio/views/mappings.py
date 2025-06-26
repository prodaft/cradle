from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from django.apps import apps
from drf_spectacular.utils import extend_schema, extend_schema_view

from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer, MappingSubclassSerializer
from core.utils import fields_to_form
from user.permissions import HasEntryManagerRole


class MappingSchemaRequestSerializer(serializers.Serializer):
    """Basic serializer for mapping schema requests"""

    pass


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_subclasses_list",
        summary="Get class mapping subclasses",
        description="Returns a list of all subclasses of ClassMapping with their names.",
        responses={
            200: MappingSubclassSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have entry manager role"},
        },
    )
)
class ClassMappingSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of ClassMapping
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, *args, **kwargs):
        subclasses = ClassMapping.__subclasses__()

        subclass_data = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        serializer = MappingSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_keys_schema",
        summary="Get mapping keys schema",
        description="Given a class name, return the possible field mappings.",
        responses={
            200: {
                "type": "object",
                "description": "Field mapping schema",
            },
            400: {"description": "Invalid class name or not a valid mapping class"},
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have entry manager role"},
        },
    )
)
class MappingKeysSchemaView(APIView):
    """
    Given a class name, return the possible values in a mapping.
    """

    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        field_mapping = fields_to_form({f.name: f for f in mapping_class._meta.fields})

        return Response(field_mapping)


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_schema_list",
        summary="Get mapping instances",
        description="Get all mapping instances for a given class.",
        responses={
            200: {
                "type": "array",
                "items": {
                    "type": "object",
                    "description": "Mapping instance data",
                },
            },
            400: {"description": "Invalid class name or not a valid mapping class"},
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have entry manager role"},
        },
    ),
    post=extend_schema(
        operation_id="mappings_schema_create_or_update",
        summary="Create or update mapping",
        description="Create a new mapping or update an existing one for a given class.",
        request=MappingSchemaRequestSerializer,
        responses={
            200: {
                "type": "object",
                "description": "Mapping instance data",
            },
            400: {
                "description": "Invalid class name, not a valid mapping class, or bad request data"
            },
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have entry manager role"},
        },
    ),
    delete=extend_schema(
        operation_id="mappings_schema_destroy",
        summary="Delete mapping",
        description="Delete a mapping instance for a given class.",
        responses={
            200: {"description": "Mapping successfully deleted"},
            400: {
                "description": "Invalid class name, not a valid mapping class, or missing mapping_id"
            },
            404: {"description": "Mapping not found"},
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have entry manager role"},
        },
    ),
)
class MappingSchemaView(APIView):
    """
    Given a class name, return the possible values in a mapping.
    """

    permission_classes = [IsAuthenticated, HasEntryManagerRole]
    serializer_class = MappingSchemaRequestSerializer

    def get(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        mappings = mapping_class.objects.all()
        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        return Response(serializer(mappings, many=True).data)

    def post(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        values = {}

        for f in mapping_class._meta.fields:
            if f.name in request.data:
                values[f.name] = request.data[f.name]

        if "internal_class" not in values:
            return Response({"error": "internal_class is required"}, status=400)

        mappingf = mapping_class.objects.filter(
            id=values.pop("id", None),
        )

        values["internal_class_id"] = values.pop("internal_class")

        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        try:
            if mappingf.exists():
                mappingf.update(**values)
                return Response(serializer(mappingf.first()).data)
            else:
                mapping = mapping_class.objects.create(**values)
                return Response(serializer(mapping).data)
        except IntegrityError as e:
            return Response({"error": str(e)}, status=400)

    def delete(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        id = request.query_params.get("mapping_id")

        if not id:
            return Response({"error": "mapping_id is required"}, status=400)

        mapping = mapping_class.objects.filter(id=id)

        if not mapping.exists():
            return Response({"error": "Mapping not found"}, status=404)

        return Response(mapping.delete())

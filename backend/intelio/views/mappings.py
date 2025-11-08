from django.apps import apps
from django.db import IntegrityError
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.utils import fields_to_form
from core.openapi import get_error_responses, get_common_error_responses
from user.permissions import HasEntryManagerRole

from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer, MappingSubclassSerializer
from ..exceptions import (
    InvalidClassNameException,
    NotMappingClassException,
    InternalClassRequiredException,
    IntegrityErrorException,
    MappingIdRequiredException,
    MappingNotFoundException,
    IntelioErrorCodes,
)


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_subclasses_list",
        summary="Get class mapping subclasses",
        description="Returns a list of all subclasses of ClassMapping with their names.",
        responses={
            200: MappingSubclassSerializer(many=True),
            **get_common_error_responses(),
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
            **get_error_responses(
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS
            ),
            **get_common_error_responses(),
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
            raise InvalidClassNameException(detail="Invalid class name")

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            raise NotMappingClassException(detail="Not a valid mapping class")

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
            **get_error_responses(
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="mappings_schema_create_or_update",
        summary="Create or update mapping",
        description="Create a new mapping or update an existing one for a given class.",
        request=OpenApiTypes.OBJECT,
        responses={
            200: {
                "type": "object",
                "description": "Mapping instance data",
            },
            **get_error_responses(
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS,
                IntelioErrorCodes.INTERNAL_CLASS_REQUIRED,
                IntelioErrorCodes.INTEGRITY_ERROR
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="mappings_schema_destroy",
        summary="Delete mapping",
        description="Delete a mapping instance for a given class.",
        parameters=[
            OpenApiParameter(
                name="mapping_id",
                type=str,
                location=OpenApiParameter.QUERY,
                description="The ID of the mapping to delete",
            ),
        ],
        responses={
            200: {"description": "Mapping successfully deleted"},
            **get_error_responses(
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS,
                IntelioErrorCodes.MAPPING_ID_REQUIRED,
                IntelioErrorCodes.MAPPING_NOT_FOUND
            ),
            **get_common_error_responses(),
        },
    ),
)
class MappingSchemaView(APIView):
    """
    Given a class name, return the possible values in a mapping.
    """

    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            raise InvalidClassNameException(detail="Invalid class name")

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            raise NotMappingClassException(detail="Not a valid mapping class")

        mappings = mapping_class.objects.all()
        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        return Response(serializer(mappings, many=True).data)

    def post(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            raise InvalidClassNameException(detail="Invalid class name")

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            raise NotMappingClassException(detail="Not a valid mapping class")

        values = {}

        for f in mapping_class._meta.fields:
            if f.name in request.data:
                values[f.name] = request.data[f.name]

        if "internal_class" not in values:
            raise InternalClassRequiredException(detail="internal_class is required")

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
            raise IntegrityErrorException(detail=str(e))

    def delete(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            raise InvalidClassNameException(detail="Invalid class name")

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            raise NotMappingClassException(detail="Not a valid mapping class")

        id = request.query_params.get("mapping_id")

        if not id:
            raise MappingIdRequiredException(detail="mapping_id is required")

        mapping = mapping_class.objects.filter(id=id)

        if not mapping.exists():
            raise MappingNotFoundException(detail="Mapping not found")

        return Response(mapping.delete())

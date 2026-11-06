"""Mapping API views: subclasses, schema, keys."""

import uuid
from contextlib import contextmanager

from django.apps import apps
from django.db import IntegrityError, transaction
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses, get_error_responses
from core.query_lang import matches_text, parse_search
from core.utils import FORM_FIELD_TYPES, fields_to_form
from user.authentication import APIKeyAuthentication, CookieJWTAuthentication
from user.permissions import HasManagerRole

from ..exceptions import (
    DataConflictException,
    IntelIOErrorCodes,
    InvalidMappingSelectionException,
    MappingNotFoundException,
    TargetTypeRequiredException,
    UnknownMappingException,
)
from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer, MappingSubclassSerializer

MAPPING_KEYS_SCHEMA = {
    "type": "object",
    "description": "Form descriptor for each editable field of the mapping class, keyed by field name.",
    "additionalProperties": {
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": list(FORM_FIELD_TYPES)},
            "options": {
                "type": "array",
                "items": {"type": "string"},
                "nullable": True,
                "description": "Allowed values when type is options.",
            },
            "description": {"type": "string", "nullable": True},
            "required": {"type": "boolean"},
            "default": {"nullable": True, "description": "Field default, or null when there is none."},
        },
        "required": ["type", "options", "description", "required", "default"],
    },
}

MAPPING_INSTANCE_SCHEMA = {
    "type": "object",
    "description": "Mapping instance: the shared fields below plus the mapping class's own fields.",
    "properties": {
        "id": {"type": "string", "format": "uuid", "readOnly": True},
        "internal_class": {"type": "string", "description": "Subtype of the CRADLE entry class this mapping targets."},
    },
    "required": ["id", "internal_class"],
    "additionalProperties": True,
}


MAPPING_REQUEST_SCHEMA = {
    "type": "object",
    "description": "The mapping class's own fields, plus the entry class subtype it targets.",
    "properties": {
        "internal_class": {
            "type": "string",
            "description": "Subtype of the CRADLE entry class this mapping targets; required when creating.",
        },
    },
    "additionalProperties": True,
}


def _get_mapping_class(class_name: str):
    """Resolve mapping class by name; raise UnknownMappingException or InvalidMappingSelectionException on failure."""
    try:
        mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
    except LookupError:
        raise UnknownMappingException(detail="That mapping is not recognized.")

    if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
        raise InvalidMappingSelectionException(detail="That selection is not a valid mapping.")

    return mapping_class


def _get_mapping_or_404(mapping_class, mapping_id: uuid.UUID):
    """Fetch a mapping by id or raise MappingNotFound."""
    mapping = mapping_class.objects.filter(id=mapping_id).first()
    if mapping is None:
        raise MappingNotFoundException(detail="That mapping could not be found.")
    return mapping


@contextmanager
def _mapping_conflict_guard():
    """Run a mapping write atomically, translating integrity errors into DataConflictException."""
    try:
        with transaction.atomic():
            yield
    except IntegrityError:
        raise DataConflictException(detail="This could not be saved because it conflicts with existing information.")


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_subclasses_list",
        summary="Get class mapping subclasses",
        description="Returns a list of all subclasses of ClassMapping with their names.",
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Search mapping types by display name or class name. Supports the search syntax: "
                    'AND/OR/NOT (or -term), "quoted phrases", =exact, and * wildcards.'
                ),
                required=False,
            ),
        ],
        responses={
            200: MappingSubclassSerializer(many=True),
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
        },
    )
)
class ClassMappingSubclassesAPIView(APIView):
    """DRF API view that returns all ClassMapping subclasses with their names."""

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasManagerRole]

    def get(self, request: Request, *args, **kwargs) -> Response:
        subclasses = ClassMapping.__subclasses__()

        subclass_data = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        node = parse_search(request.query_params.get("search"))
        if node is not None:
            subclass_data = [s for s in subclass_data if matches_text(node, [s["name"], s["class"]])]

        serializer = MappingSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_keys_schema",
        summary="Get mapping keys schema",
        description="Given a class name, return the possible field mappings.",
        responses={
            200: MAPPING_KEYS_SCHEMA,
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
            ),
            **get_common_error_responses(),
        },
    )
)
class MappingKeysSchemaView(APIView):
    """Given a class name, return the possible values in a mapping."""

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasManagerRole]

    def get(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        field_mapping = fields_to_form({f.name: f for f in mapping_class._meta.fields})

        return Response(field_mapping, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_schema_list",
        summary="Get mapping instances",
        description="Get all mapping instances for a given class.",
        responses={
            200: {"type": "array", "items": MAPPING_INSTANCE_SCHEMA},
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="mappings_schema_create",
        summary="Create mapping",
        description="Create a new mapping for a given class.",
        request={"application/json": MAPPING_REQUEST_SCHEMA},
        responses={
            201: MAPPING_INSTANCE_SCHEMA,
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.TARGET_TYPE_REQUIRED,
                IntelIOErrorCodes.DATA_CONFLICT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class MappingSchemaView(APIView):
    """Given a class name, return the possible values in a mapping."""

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasManagerRole]

    def get(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mappings = mapping_class.objects.all()
        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        return Response(serializer(mappings, many=True).data, status=status.HTTP_200_OK)

    def post(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        serializer_class = ClassMappingSerializer.get_serializer(mapping_class)
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "internal_class" not in serializer.validated_data:
            raise TargetTypeRequiredException(detail="Select which entry type this mapping applies to.")

        with _mapping_conflict_guard():
            mapping = serializer.save()

        location = request.build_absolute_uri(
            reverse("mapping_detail", kwargs={"class_name": class_name, "mapping_id": mapping.id})
        )
        return Response(
            serializer_class(mapping).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="mappings_retrieve",
        summary="Get mapping",
        description="Return one mapping of a given class.",
        responses={
            200: MAPPING_INSTANCE_SCHEMA,
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.MAPPING_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="mappings_partial_update",
        summary="Update mapping",
        description="Update an existing mapping of a given class.",
        request={"application/json": MAPPING_REQUEST_SCHEMA},
        responses={
            200: MAPPING_INSTANCE_SCHEMA,
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.MAPPING_NOT_FOUND,
                IntelIOErrorCodes.DATA_CONFLICT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="mappings_destroy",
        summary="Delete mapping",
        description="Delete a mapping instance for a given class.",
        responses={
            204: {"description": "Mapping successfully deleted"},
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.MAPPING_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
)
class MappingDetailView(APIView):
    """Read, update or delete one mapping of a given class."""

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasManagerRole]

    def get(self, request: Request, class_name: str, mapping_id: uuid.UUID) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mapping = _get_mapping_or_404(mapping_class, mapping_id)
        return Response(ClassMappingSerializer.get_serializer(mapping_class)(mapping).data, status=status.HTTP_200_OK)

    def patch(self, request: Request, class_name: str, mapping_id: uuid.UUID) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mapping = _get_mapping_or_404(mapping_class, mapping_id)

        serializer_class = ClassMappingSerializer.get_serializer(mapping_class)
        serializer = serializer_class(mapping, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with _mapping_conflict_guard():
            serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, class_name: str, mapping_id: uuid.UUID) -> Response:
        _get_mapping_or_404(_get_mapping_class(class_name), mapping_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

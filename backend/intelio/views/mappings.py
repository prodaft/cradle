"""Mapping API views: subclasses, schema, keys."""

import uuid
from contextlib import contextmanager

from django.apps import apps
from django.db import IntegrityError, transaction
from django.urls import reverse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses, get_error_responses
from core.query_lang import matches_text, parse_search
from core.utils import fields_to_form
from user.authentication import APIKeyAuthentication, CookieJWTAuthentication
from user.permissions import HasManagerRole

from ..exceptions import (
    DataConflictException,
    IntelIOErrorCodes,
    InvalidMappingException,
    InvalidMappingSelectionException,
    MappingNotFoundException,
    MappingRequiredException,
    TargetTypeRequiredException,
    UnknownMappingException,
)
from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer, MappingSubclassSerializer


def _get_mapping_class(class_name: str):
    """Resolve mapping class by name; raise UnknownMappingException or InvalidMappingSelectionException on failure."""
    try:
        mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
    except LookupError:
        raise UnknownMappingException(detail="That mapping is not recognized.")

    if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
        raise InvalidMappingSelectionException(detail="That selection is not a valid mapping.")

    return mapping_class


def _get_mapping_or_404(mapping_class, mapping_id):
    """Fetch a mapping by id; raise MappingRequired/InvalidMapping/MappingNotFound on failure."""
    if not mapping_id:
        raise MappingRequiredException(detail="A mapping is required.")

    try:
        uuid.UUID(str(mapping_id))
    except ValueError, TypeError, AttributeError:
        raise InvalidMappingException(detail="That mapping is not valid.")

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
            200: {
                "type": "object",
                "description": "Field mapping schema",
            },
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
            200: {
                "type": "array",
                "items": {
                    "type": "object",
                    "description": "Mapping instance data",
                },
            },
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
        request=OpenApiTypes.OBJECT,
        responses={
            201: {
                "type": "object",
                "description": "Mapping instance data",
            },
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
    patch=extend_schema(
        operation_id="mappings_schema_partial_update",
        summary="Update mapping",
        description="Update an existing mapping for a given class. The body must include the mapping `id`.",
        request=OpenApiTypes.OBJECT,
        responses={
            200: {
                "type": "object",
                "description": "Mapping instance data",
            },
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.MAPPING_REQUIRED,
                IntelIOErrorCodes.INVALID_MAPPING,
                IntelIOErrorCodes.MAPPING_NOT_FOUND,
                IntelIOErrorCodes.DATA_CONFLICT,
                include_validation_error=True,
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
            204: {"description": "Mapping successfully deleted"},
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_MAPPING,
                IntelIOErrorCodes.INVALID_MAPPING_SELECTION,
                IntelIOErrorCodes.MAPPING_REQUIRED,
                IntelIOErrorCodes.INVALID_MAPPING,
                IntelIOErrorCodes.MAPPING_NOT_FOUND,
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

        mapping_url = reverse("mapping_schema", kwargs={"class_name": class_name})
        location = request.build_absolute_uri(f"{mapping_url}?mapping_id={mapping.id}")
        return Response(
            serializer_class(mapping).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )

    def patch(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mapping = _get_mapping_or_404(mapping_class, request.data.get("id"))

        serializer_class = ClassMappingSerializer.get_serializer(mapping_class)
        serializer = serializer_class(mapping, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with _mapping_conflict_guard():
            serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, class_name: str) -> Response:
        mapping = _get_mapping_or_404(_get_mapping_class(class_name), request.query_params.get("mapping_id"))
        mapping.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

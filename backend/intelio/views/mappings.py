"""Mapping API views: subclasses, schema, keys."""

import uuid

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
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from core.utils import fields_to_form
from user.authentication import APIKeyAuthentication
from user.permissions import HasEntryManagerRole

from ..exceptions import (
    IntegrityErrorException,
    IntelioErrorCodes,
    InternalClassRequiredException,
    InvalidClassNameException,
    InvalidMappingIdException,
    MappingIdRequiredException,
    MappingNotFoundException,
    NotMappingClassException,
)
from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer, MappingSubclassSerializer


def _get_mapping_class(class_name: str):
    """Resolve mapping class by name; raise InvalidClassNameException or NotMappingClassException on failure."""
    try:
        mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
    except LookupError:
        raise InvalidClassNameException(detail="Invalid class name.")

    if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
        raise NotMappingClassException(detail="Not a valid mapping class.")

    return mapping_class


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
                description="Search mapping types by name or class name",
                required=False,
            ),
        ],
        responses={
            200: MappingSubclassSerializer(many=True),
            **get_common_error_responses(),
        },
    )
)
class ClassMappingSubclassesAPIView(APIView):
    """DRF API view that returns all ClassMapping subclasses with their names."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request, *args, **kwargs) -> Response:
        subclasses = ClassMapping.__subclasses__()

        subclass_data = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        search = request.query_params.get("search")
        if search:
            search_lower = search.lower()
            subclass_data = [
                s for s in subclass_data if search_lower in s["name"].lower() or search_lower in s["class"].lower()
            ]

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
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS,
            ),
            **get_common_error_responses(),
        },
    )
)
class MappingKeysSchemaView(APIView):
    """Given a class name, return the possible values in a mapping."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

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
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS,
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
                IntelioErrorCodes.INVALID_MAPPING_ID,
                IntelioErrorCodes.INTEGRITY_ERROR,
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
                IntelioErrorCodes.INVALID_CLASS_NAME,
                IntelioErrorCodes.NOT_MAPPING_CLASS,
                IntelioErrorCodes.MAPPING_ID_REQUIRED,
                IntelioErrorCodes.INVALID_MAPPING_ID,
                IntelioErrorCodes.MAPPING_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
)
class MappingSchemaView(APIView):
    """Given a class name, return the possible values in a mapping."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mappings = mapping_class.objects.all()
        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        return Response(serializer(mappings, many=True).data, status=status.HTTP_200_OK)

    def post(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        serializer = ClassMappingSerializer.get_serializer(mapping_class)(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated_data = dict(serializer.validated_data)

        mapping_id = validated_data.pop("id", None) or request.data.get("id")
        if mapping_id is not None:
            try:
                uuid.UUID(str(mapping_id))
            except (ValueError, TypeError, AttributeError):
                raise InvalidMappingIdException(detail="Invalid mapping ID format. Must be a valid UUID.")

        if mapping_id is None and "internal_class" not in validated_data:
            raise InternalClassRequiredException(detail="internal_class is required.")

        if "internal_class" in validated_data:
            validated_data["internal_class_id"] = validated_data.pop("internal_class").pk

        existing_mapping = mapping_class.objects.filter(id=mapping_id)
        response_serializer = ClassMappingSerializer.get_serializer(mapping_class)

        try:
            with transaction.atomic():
                if existing_mapping.exists():
                    existing_mapping.update(**validated_data)
                    updated = mapping_class.objects.get(id=mapping_id)
                    return Response(response_serializer(updated).data, status=status.HTTP_200_OK)
                elif mapping_id is not None:
                    raise MappingNotFoundException(detail="Mapping not found.")
                else:
                    mapping = mapping_class.objects.create(**validated_data)
                    mapping_url = reverse(
                        "mapping_schema",
                        kwargs={"class_name": class_name},
                    )
                    location = request.build_absolute_uri(f"{mapping_url}?mapping_id={mapping.id}")
                    return Response(
                        response_serializer(mapping).data,
                        status=status.HTTP_201_CREATED,
                        headers={"Location": location},
                    )
        except mapping_class.DoesNotExist:
            raise MappingNotFoundException(detail="Mapping not found.")
        except IntegrityError:
            raise IntegrityErrorException(detail="A database constraint was violated.")

    def delete(self, request: Request, class_name: str) -> Response:
        mapping_class = _get_mapping_class(class_name)
        mapping_id = request.query_params.get("mapping_id")

        if not mapping_id:
            raise MappingIdRequiredException(detail="mapping_id is required.")

        try:
            uuid.UUID(str(mapping_id))
        except (ValueError, TypeError, AttributeError):
            raise InvalidMappingIdException(detail="Invalid mapping ID format. Must be a valid UUID.")

        try:
            mapping = mapping_class.objects.get(id=mapping_id)
        except mapping_class.DoesNotExist:
            raise MappingNotFoundException(detail="Mapping not found.")

        mapping.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

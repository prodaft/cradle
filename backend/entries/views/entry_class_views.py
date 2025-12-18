from typing import cast

from django.conf import settings
from django.db.models.functions import Length
from django_lifecycle.mixins import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from user.models import CradleUser
from user.permissions import HasAdminRole, HasEntryManagerRole

from ..exceptions import (
    AdminOnlyEntryClassDeleteException,
    AdminOnlyEntryClassTypeChangeException,
    AdminOnlyViewCountException,
    CannotDeleteAliasClassException,
    CannotEditAliasClassException,
    EntriesErrorCodes,
    EntryClassNotFoundException,
)
from ..models import Entry, EntryClass
from ..serializers import (
    EntryClassSerializer,
    EntryClassSerializerCount,
    NextNameResponseSerializer,
)


@extend_schema_view(
    get=extend_schema(
        operation_id="entry_classes_list",
        summary="List Entry Classes",
        description="Retrieve a list of all entry classes.",
        parameters=[
            OpenApiParameter(
                name="show_count",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Show the count of entries in each class",
            )
        ],
        responses={
            200: EntryClassSerializerCount(many=True),
            **get_error_responses(
                EntriesErrorCodes.ADMIN_ONLY_VIEW_COUNT,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="entry_classes_create",
        summary="Create entry class",
        description="Creates a new entry class. Only available to admin users.",
        request=EntryClassSerializer,
        responses={
            200: EntryClassSerializer,
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
)
class EntryClassList(APIView):
    authentication_classes = [JWTAuthentication]

    def has_permission(self, request, view):
        if not IsAuthenticated.has_permission(self, request, view):
            return False

        if request.method == "GET":
            return True

        if HasEntryManagerRole.has_permission(self, request, view):
            return True

        return False

    def get(self, request: Request) -> Response:
        # Optimize queries to prevent N+1 issues
        entities = EntryClass.objects.prefetch_related("children")

        if request.query_params.get("show_count") == "true":
            if not request.user.is_entry_manager:
                raise AdminOnlyViewCountException(
                    detail="User must be an admin to see the count of entries in each class."
                )
            # For count queries, we need to prefetch entry counts as well
            from django.db.models import Count

            entities = entities.annotate(entry_count=Count("entries"))
            serializer = EntryClassSerializerCount(entities, many=True)
        else:
            serializer = EntryClassSerializer(entities, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)

        serializer = EntryClassSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        serializer.instance.log_create(user)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="entry_classes_retrieve",
        summary="Get entry class details",
        description="Returns details of a specific entry class.",
        parameters=[
            OpenApiParameter(
                name="class_subtype",
                type=str,
                location=OpenApiParameter.PATH,
                description="Subtype of the entry class",
            )
        ],
        responses={
            200: EntryClassSerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTRY_CLASS_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="entry_classes_destroy",
        summary="Delete entry class",
        description="Deletes an entry class. Only available to admin users. Cannot delete the 'alias' entry class.",
        parameters=[
            OpenApiParameter(
                name="class_subtype",
                type=str,
                location=OpenApiParameter.PATH,
                description="Subtype of the entry class to delete",
            )
        ],
        responses={
            200: {"description": "Entry class successfully deleted"},
            **get_error_responses(
                EntriesErrorCodes.CANNOT_DELETE_ALIAS_CLASS,
                EntriesErrorCodes.ADMIN_ONLY_ENTRY_CLASS_DELETE,
                EntriesErrorCodes.ENTRY_CLASS_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="entry_classes_update",
        summary="Update entry class",
        description="Updates an existing entry class. Cannot edit the 'alias' entry class.",
        request=EntryClassSerializer,
        parameters=[
            OpenApiParameter(
                name="class_subtype",
                type=str,
                location=OpenApiParameter.PATH,
                description="Subtype of the entry class to update",
            )
        ],
        responses={
            200: EntryClassSerializer,
            **get_validation_error_response(),
            **get_error_responses(
                EntriesErrorCodes.CANNOT_EDIT_ALIAS_CLASS,
                EntriesErrorCodes.ENTRY_CLASS_NOT_FOUND,
                EntriesErrorCodes.ADMIN_ONLY_ENTRY_CLASS_TYPE_CHANGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntryClassDetail(APIView):
    authentication_classes = [JWTAuthentication]

    def has_permission(self, request, view):
        if not IsAuthenticated.has_permission(self, request, view):
            return False

        if request.method == "GET":
            return True

        if HasEntryManagerRole.has_permission(self, request, view):
            return True

        return False

    def get(self, request: Request, class_subtype: str) -> Response:
        try:
            entity = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            raise EntryClassNotFoundException(
                detail="There is no entry class with specified subtype."
            )
        serializer = EntryClassSerializer(entity)
        return Response(serializer.data)

    def delete(self, request: Request, class_subtype: str) -> Response:
        if class_subtype in settings.INTERNAL_SUBTYPES:
            raise CannotDeleteAliasClassException(
                detail="Cannot delete the alias entry class."
            )

        if not request.user.is_cradle_admin:
            raise AdminOnlyEntryClassDeleteException(
                detail="User must be an admin to delete entry classes."
            )

        try:
            entity_class = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            raise EntryClassNotFoundException(
                detail="There is no entry class with specified subtype."
            )

        entity_class.rename(None, request.user.id)

        return Response("Requested entry class was deleted", status=status.HTTP_200_OK)

    def post(self, request: Request, class_subtype: str) -> Response:
        if class_subtype in settings.INTERNAL_SUBTYPES:
            raise CannotEditAliasClassException(
                detail="Cannot edit the alias entry class."
            )

        user = cast(CradleUser, request.user)

        try:
            entryclass = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            raise EntryClassNotFoundException(
                detail="There is no entry class with specified subtype."
            )

        if not user.is_cradle_admin and request.data["type"] != entryclass.type:
            raise AdminOnlyEntryClassTypeChangeException(
                detail="User must be an admin to change entry class type!"
            )

        new_subtype = request.data.get("subtype", None)

        with transaction.atomic():
            if new_subtype != class_subtype and new_subtype:
                entryclass = entryclass.rename(new_subtype, user.id)

            serializer = EntryClassSerializer(entryclass, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            response = dict(serializer.data)
            entryclass.log_edit(user)

            return Response(response)


@extend_schema_view(
    get=extend_schema(
        summary="Get next available name",
        description="Returns the next available name for entries of this class based on the class prefix and existing entries.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="class_subtype",
                type=str,
                location=OpenApiParameter.PATH,
                description="Subtype of the entry class",
            )
        ],
        responses={
            200: NextNameResponseSerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTRY_CLASS_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    )
)
class NextName(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request: Request, class_subtype: str) -> Response:
        try:
            eclass = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            raise EntryClassNotFoundException(
                detail="There is no entry class with specified subtype."
            )

        if not eclass.prefix:
            return Response({"name": None})

        all_entries = Entry.objects.filter(entry_class__subtype=eclass.subtype)

        if not all_entries.exists():
            max_number = 0
        else:
            max_entry = (
                all_entries.annotate(name_length=Length("name"))
                .order_by("-name_length", "-name")
                .first()
            )

            max_number = int(max_entry.name[len(eclass.prefix) :])
        return Response({"name": f"{eclass.prefix}{max_number + 1}"})

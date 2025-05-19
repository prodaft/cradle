from typing import cast
from django.db.models.functions import Length
from django_lifecycle.mixins import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from user.models import CradleUser
from user.permissions import HasAdminRole, HasEntryManagerRole

from ..serializers import (
    EntryClassSerializer,
    EntryClassSerializerCount,
)
from ..models import Entry, EntryClass


@extend_schema_view(
    get=extend_schema(
        summary="List Entry Classes",
        description="Retrieve a list of all entry classes.",
        responses={
            200: EntryClassSerializer(many=True),
            401: "User is not authenticated",
            403: "User is not authorized to view entry classes' count",
        },
    ),
    post=extend_schema(
        summary="Create entry class",
        description="Creates a new entry class. Only available to admin users.",
        request=EntryClassSerializer,
        responses={
            200: EntryClassSerializer,
            400: {"description": "Invalid data provided"},
            403: {"description": "User is not an admin"},
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
        entities = EntryClass.objects.all()
        if request.query_params.get("show_count") == "true":
            if not request.user.is_entry_manager:
                return Response(
                    "User must be an admin to see the count of entries in each class.",
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = EntryClassSerializerCount(entities, many=True)
        else:
            serializer = EntryClassSerializer(entities, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)

        serializer = EntryClassSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            serializer.instance.log_create(user)
            return Response(serializer.data)
        return Response("The data is not valid", status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
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
            404: {"description": "Entry class not found"},
        },
    ),
    delete=extend_schema(
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
            403: {
                "description": "User is not an admin or trying to delete 'alias' class"
            },
            404: {"description": "Entry class not found"},
        },
    ),
    post=extend_schema(
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
            403: {"description": "Trying to edit 'alias' class"},
            404: {"description": "Entry class not found"},
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
            return Response(
                "There is no entry class with specified subtype.",
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = EntryClassSerializer(entity)
        return Response(serializer.data)

    def delete(self, request: Request, class_subtype: str) -> Response:
        if class_subtype == "alias" or class_subtype == "virtual":
            return Response(
                "Cannot delete the alias entry class.", status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.is_cradle_admin:
            return Response("User must be an admin to delete entry classes.")

        try:
            entity_class = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            return Response(
                "There is no entry class with specified subtype.",
                status=status.HTTP_404_NOT_FOUND,
            )

        entity_class.rename(None, request.user.id)

        return Response("Requested entry class was deleted", status=status.HTTP_200_OK)

    def post(self, request: Request, class_subtype: str) -> Response:
        if class_subtype == "alias" or class_subtype == "virtual":
            return Response(
                "Cannot edit the alias entry class.", status=status.HTTP_403_FORBIDDEN
            )

        user = cast(CradleUser, request.user)

        try:
            entryclass = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            return Response(
                "There is no entry class with specified subtype.",
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_cradle_admin and request.data["type"] != entryclass.type:
            return Response(
                "User must be an admin to change entry class type!",
                status=status.HTTP_403_FORBIDDEN,
            )

        new_subtype = request.data.get("subtype", None)

        with transaction.atomic():
            if new_subtype != class_subtype and new_subtype:
                entryclass = entryclass.rename(new_subtype, user.id)

            serializer = EntryClassSerializer(entryclass, data=request.data)

            if serializer.is_valid():
                serializer.save()

                response = dict(serializer.data)
                entryclass.log_edit(user)

                return Response(response)

        return Response(serializer.error_messages, status=status.HTTP_400_BAD_REQUEST)


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
            200: {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "nullable": True,
                        "description": "Next available name, or null if class has no prefix",
                    }
                },
            },
            404: {"description": "Entry class not found"},
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
            return Response(
                "There is no entry class with specified subtype.",
                status=status.HTTP_404_NOT_FOUND,
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

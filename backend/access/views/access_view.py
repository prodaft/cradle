from uuid import UUID

from access.enums import AccessType
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.db.models import Q

from user.models import CradleUser, UserRoles
from user.permissions import HasAdminRole

from ..models import Access
from ..serializers import AccessEntitySerializer, AccessUserSerializer
from entries.models import Entry
from entries.enums import EntryType


@extend_schema_view(
    get=extend_schema(
        summary="Get user access privileges",
        description="Returns a list of all entities with their access types for a specific user. Only available to admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user to get access privileges for",
            )
        ],
        responses={
            200: AccessEntitySerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not an admin"},
            404: {"description": "User not found"},
        },
    )
)
class UserAccessList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    serializer_class = AccessEntitySerializer

    def get(self, request: Request, user_id: UUID) -> Response:
        """Allows an admin to get the access priviliges of a User
            on all Entities.

        Args:
            request: The request that was sent
            user_id: Id of the user whose access is updated

        Returns:
            Response(body, status=200):
                if the request was successful. The body will contain a JSON
                representation of a list of all entities with an additional
                "access_type" attribute.
                Example: [{"id" : 2, "name" : "Entity 1", "access_type" : "none"}]
            Response("User is not authenticated", status=401):
                if the user was not authenticated.
            Response("User is not an admin", status=403):
                if the user was not an admin.
            Response("User does not exist.", status=404):
                if the user does not exist.
        """
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response("User does not exist", status=status.HTTP_404_NOT_FOUND)

        entities_with_access = Access.objects.get_accesses(user)

        serializer = AccessEntitySerializer(
            entities_with_access, context={"is_admin": user.is_cradle_admin}, many=True
        )

        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="Get entity access privileges",
        description="Returns a list of all users with their access types for a specific entity. Only available to admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the entity to get access privileges for",
            )
        ],
        responses={
            200: AccessUserSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not an admin"},
            404: {"description": "Entity not found"},
        },
    )
)
class EntityAccessList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request: Request, entity_id: int) -> Response:
        """Allows an admin to get the access priviliges of a User
            on an entity.

        Args:
            request: The request that was sent
            entity_id: Id of the entity whose access is updated

        Returns:
            Response(body, status=200):
        """
        entity = Entry.objects.filter(
            id=entity_id, entry_class__type=EntryType.ENTITY
        ).first()

        if not entity:
            return Response("Entity does not exist", status=status.HTTP_404_NOT_FOUND)

        accesses = Access.objects.filter(
            Q(entity=entity)
            & ~Q(access_type=AccessType.NONE)
            & ~Q(user__role=UserRoles.ADMIN)
        )
        serializer = AccessUserSerializer(accesses, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

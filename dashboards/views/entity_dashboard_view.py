from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from entries.models import Entry
from user.models import CradleUser
from access.models import Access
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import EntityDashboardSerializer, SecondHopDashboardSerializer
from access.enums import AccessType

from typing import cast

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
    OpenApiTypes,
)


@extend_schema(
    operation_id="retrieve_entity_dashboard",
    summary="Retrieve the dashboard of a specific entity by name",
    description=(
        "Allows an **authenticated user** to retrieve the dashboard of an Entity by "
        "specifying its name. Optionally, the entity subtype can be provided as a "
        "query parameter (`?subtype=someSubType`). Returns a **200** response with the "
        "entity’s dashboard if successful, **404** if the entity does not exist or is "
        "inaccessible, and **401** if the user is not authenticated."
    ),
    parameters=[
        OpenApiParameter(
            name="entity_name",
            description="Name of the entity (path parameter)",
            required=True,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.PATH,
        ),
        OpenApiParameter(
            name="subtype",
            description="Optional subtype of the entity (query parameter)",
            required=False,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
        ),
    ],
    responses={
        200: OpenApiResponse(
            response=EntityDashboardSerializer,
            description=(
                "Successful retrieval of the entity dashboard. "
                "See `EntityDashboardSerializer` for field details."
            ),
            examples=[
                OpenApiExample(
                    name="Successful Response Example",
                    value={
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "MyEntity",
                        "description": "An example entity.",
                        "type": "SomeType",
                        "subtype": "SomeSubType",
                        "entities": [],
                        "artifacts": [],
                        "inaccessible_entities": [],
                        "inaccessible_artifacts": [],
                        "access": "read-write",
                        "second_hop_lazyload": True,
                    },
                )
            ],
        ),
        401: OpenApiResponse(
            description="User is not authenticated.",
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Unauthenticated", value="User is not authenticated."
                )
            ],
        ),
        404: OpenApiResponse(
            description="Entity not found or user has no access to it.",
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Not Found", value="There is no entity with specified name"
                )
            ],
        ),
    },
)
class EntityDashboard(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, entity_name: str) -> Response:
        """Allow a user to retrieve the dashboard of an Entity by specifying its name.

        Args:
            request: The request that was sent
            entity_name: The name of the entity that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the entity
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no entity with specified name", status=404):
                if there is no entity with the provided name
                or the user does not have access to it
        """

        user: CradleUser = cast(CradleUser, request.user)

        entity_subtype = request.query_params.get("subtype")

        try:
            entity = Entry.entities.get(
                name=entity_name, entry_class__subtype=entity_subtype
            )
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        if not Access.objects.has_access_to_entities(
            user, {entity}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            return Response(
                "There is no entity with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entries_dict = DashboardUtils.get_dashboard(user, entity.id)

        dashboard = DashboardUtils.add_entry_fields(entity, entries_dict)

        if user.is_superuser:
            dashboard["access"] = "read-write"
        else:
            dashboard["access"] = Access.objects.get_or_create(
                user=user, entity=entity
            )[0].access_type

        dashboard["seocnd_hop_lazyload"] = True

        return Response(EntityDashboardSerializer(dashboard).data)


@extend_schema(
    operation_id="retrieve_entity_dashboard_second_hop",
    summary="Retrieve the second-hop dashboard of a specific entity by name",
    description=(
        "Allows an **authenticated user** to retrieve second-hop data for an "
        "Entity by specifying its name and optional subtype. Returns a **200** "
        "response with the second-hop dashboard if successful, **404** if not found "
        "or not accessible, and **401** if the user is not authenticated."
    ),
    parameters=[
        OpenApiParameter(
            name="entity_name",
            description="Name of the entity (path parameter)",
            required=True,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.PATH,
        ),
        OpenApiParameter(
            name="subtype",
            description="Optional subtype of the entity (query parameter)",
            required=False,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
        ),
    ],
    responses={
        200: OpenApiResponse(
            response=SecondHopDashboardSerializer,
            description=(
                "Successful retrieval of the second-hop data. "
                "See `SecondHopDashboardSerializer` for field details."
            ),
            examples=[
                OpenApiExample(
                    name="Successful Second Hop Example",
                    value={
                        "second_hop_entities": [],
                        "second_hop_inaccessible_entities": [],
                    },
                )
            ],
        ),
        401: OpenApiResponse(
            description="User is not authenticated.",
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Unauthenticated", value="User is not authenticated."
                )
            ],
        ),
        404: OpenApiResponse(
            description="Entity not found or user has no access to it.",
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Not Found", value="There is no entity with specified name"
                )
            ],
        ),
    },
)
class EntityDashboardSecondHop(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, entity_name: str) -> Response:
        """Allow a user to retrieve the dashboard of an Entity by specifying its name.

        Args:
            request: The request that was sent
            entity_name: The name of the entity that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the entity
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no entity with specified name", status=404):
                if there is no entity with the provided name
                or the user does not have access to it
        """
        user: CradleUser = cast(CradleUser, request.user)

        entity_subtype = request.query_params.get("subtype")

        try:
            entity = Entry.entities.get(
                name=entity_name, entry_class__subtype=entity_subtype
            )
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        if not Access.objects.has_access_to_entities(
            user, {entity}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            return Response(
                "There is no entity with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entries_dict = DashboardUtils.get_dashboard_second_hop(user, entity.id)

        dashboard = DashboardUtils.add_entry_fields(entity, entries_dict)

        return Response(SecondHopDashboardSerializer(dashboard).data)

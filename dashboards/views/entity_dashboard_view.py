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
from ..serializers import EntityDashboardSerializer
from access.enums import AccessType

from typing import cast


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

        entries_dict, neighbor_map = DashboardUtils.get_dashboard(user, entity.id)

        dashboard = DashboardUtils.add_entry_fields(entity, entries_dict)

        if user.is_superuser:
            dashboard["access"] = "read-write"
        else:
            dashboard["access"] = Access.objects.get_or_create(
                user=user, entity=entity
            )[0].access_type

        return Response(EntityDashboardSerializer(dashboard, context=neighbor_map).data)

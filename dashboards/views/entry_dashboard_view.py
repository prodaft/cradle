from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast

from entities.models import Entity
from entities.enums import EntrySubtype
from user.models import CradleUser
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import EntryDashboardSerializer


class EntryDashboard(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, entry_name: str) -> Response:
        """Allow a user to retrieve the dashboard of an Entry by specifying its name.

        Args:
            request: The request that was sent
            case_name: The name of the entry that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the entry
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no entry with specified name", status=404):
                if there is no entry with the provided name
        """

        user: CradleUser = cast(CradleUser, request.user)

        entry_subtype = request.query_params.get("subtype")

        if entry_subtype not in EntrySubtype.values:
            return Response(
                "Invalid subtype",
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entry = Entity.entries.get(name=entry_name, subtype=entry_subtype)
        except Entity.DoesNotExist:
            return Response(
                "There is no entry with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entities_dict = DashboardUtils.get_dashboard(user, entry.id)

        dashboard = DashboardUtils.add_entity_fields(entry, entities_dict)

        return Response(EntryDashboardSerializer(dashboard).data)

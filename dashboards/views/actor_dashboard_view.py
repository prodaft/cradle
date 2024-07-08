from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast

from entries.models import Entry
from user.models import CradleUser
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import ActorDashboardSerializer
from logs.decorators import log_failed_responses


class ActorDashboard(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request, actor_name: str) -> Response:
        """Allow a user to retrieve the dashboard of an Actor by specifying its name.

        Args:
            request: The request that was sent
            case_name: The name of the actor that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the actor
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no case with specified name", status=404):
                if there is no actor with the provided name
        """

        user: CradleUser = cast(CradleUser, request.user)

        try:
            actor = Entry.actors.get(name=actor_name)
        except Entry.DoesNotExist:
            return Response(
                "There is no actor with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entries_dict, neighbor_map = DashboardUtils.get_dashboard(user, actor.id)

        dashboard = DashboardUtils.add_entry_fields(actor, entries_dict)

        return Response(ActorDashboardSerializer(dashboard, context=neighbor_map).data)

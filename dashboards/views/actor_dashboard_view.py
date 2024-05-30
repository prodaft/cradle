from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast

from entities.models import Entity
from user.models import CradleUser
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import ActorDashboardSerializer


class ActorDashboard(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, actor_name: str) -> Response:
        """Allow a user to retrieve the dashboars of a Case by specifying its name.

        Args:
            request: The request that was sent
            case_name: The name of the case that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the case
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no case with specified name", status=404):
                if there is no case with the provided name
                or the user does not have access to it
        """

        user: CradleUser = cast(CradleUser, request.user)

        try:
            actor = Entity.actors.get(name=actor_name)
        except Entity.DoesNotExist:
            return Response(
                "There is no actor with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entities_dict = DashboardUtils.get_dashboard(user, actor.id)

        dashboard = DashboardUtils.add_entity_fields(actor, entities_dict)

        return Response(ActorDashboardSerializer(dashboard).data)

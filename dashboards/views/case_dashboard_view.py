from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from entities.models import Entity
from user.models import CradleUser
from entities.enums import EntityType
from access.models import Access
from ..utils.dashboard_utils import DashboardUtils
from ..serializers.dashboard_serializers import CaseDashboardSerializer
from notes.models import Note
from access.enums import AccessType

from typing import cast


class CaseDashboard(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, case_name: str) -> Response:
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
            case = Entity.cases.get(name=case_name)
        except Entity.DoesNotExist:
            return Response(
                "There is no case with specified name", status=status.HTTP_404_NOT_FOUND
            )

        if not Access.objects.has_access_to_cases(
            user, {case}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            return Response(
                "There is no case with specified name", status=status.HTTP_404_NOT_FOUND
            )

        notes = Note.objects.get_accessible_notes(user, case.id)
        actors = Note.objects.get_entities_of_type(case.id, EntityType.ACTOR)
        metadata = Note.objects.get_entities_of_type(case.id, EntityType.METADATA)
        cases = Note.objects.get_entities_of_type(case.id, EntityType.CASE)
        entries = Note.objects.get_entities_of_type(case.id, EntityType.ENTRY)

        dashboard = DashboardUtils.get_dashboard_json(
            case, notes, actors, cases, metadata, entries, user
        )

        return Response(CaseDashboardSerializer(dashboard).data)

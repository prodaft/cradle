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
from ..serializers import CaseDashboardSerializer
from access.enums import AccessType
from logs.decorators import log_failed_responses

from typing import cast


class CaseDashboard(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request, case_name: str) -> Response:
        """Allow a user to retrieve the dashboard of a Case by specifying its name.

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
            case = Entry.cases.get(name=case_name)
        except Entry.DoesNotExist:
            return Response(
                "There is no case with specified name", status=status.HTTP_404_NOT_FOUND
            )

        if not Access.objects.has_access_to_cases(
            user, {case}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            return Response(
                "There is no case with specified name", status=status.HTTP_404_NOT_FOUND
            )

        entries_dict, neighbor_map = DashboardUtils.get_dashboard(user, case.id)

        dashboard = DashboardUtils.add_entry_fields(case, entries_dict)

        if user.is_superuser:
            dashboard["access"] = "read-write"
        else:
            dashboard["access"] = Access.objects.get_or_create(user=user, case=case)[
                0
            ].access_type

        return Response(CaseDashboardSerializer(dashboard, context=neighbor_map).data)

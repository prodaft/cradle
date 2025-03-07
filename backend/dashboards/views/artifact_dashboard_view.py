from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast
from drf_spectacular.utils import extend_schema, OpenApiParameter

from entries.models import Entry, EntryClass
from user.models import CradleUser
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import ArtifactDashboardSerializer
from notes.models import Note
from drf_spectacular.utils import extend_schema_view


@extend_schema_view(
    get=extend_schema(
        summary="Get Artifact Dashboard",
        description="Retrieve dashboard information for a specific artifact by name.",
        parameters=[
            OpenApiParameter(
                name="subtype",
                description="The subtype of the artifact",
                required=True,
                type=str,
            ),
        ],
        responses={
            200: ArtifactDashboardSerializer,
            400: "Invalid artifact subtype",
            401: "User is not authenticated",
            404: "Artifact not found",
        },
    )
)
class ArtifactDashboard(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, artifact_name: str) -> Response:
        """Allow a user to retrieve the dashboard of an Artifact by specifying its name.

        Args:
            request: The request that was sent
            entity_name: The name of the artifact that will be retrieved

        Returns:
            Response(status=200): A JSON response containing the dashboard of the artifact
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There is no artifact with specified name", status=404):
                if there is no artifact with the provided name or the artifact exists but is
                not referenced in any of the user's accessible notes
        """

        user: CradleUser = cast(CradleUser, request.user)

        artifact_subtype = request.query_params.get("subtype")

        if EntryClass.objects.filter(subtype=artifact_subtype).count() == 0:
            return Response(
                "There is no artifact with specified subtype",
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            artifact = Entry.artifacts.get(
                name=artifact_name, entry_class__subtype=artifact_subtype
            )
        except Entry.DoesNotExist:
            return Response(
                "There is no artifact with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        if not Note.objects.get_accessible_notes(user, artifact.id).exists():
            return Response(
                "There is no artifact with specified name",
                status=status.HTTP_404_NOT_FOUND,
            )

        entries_dict, neighbor_map = DashboardUtils.get_dashboard(user, artifact.id)

        dashboard = DashboardUtils.add_entry_fields(artifact, entries_dict)

        return Response(
            ArtifactDashboardSerializer(dashboard, context=neighbor_map).data
        )

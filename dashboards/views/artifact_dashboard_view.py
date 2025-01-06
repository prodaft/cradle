from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast

from entries.models import Entry, EntryClass
from user.models import CradleUser
from ..utils.dashboard_utils import DashboardUtils
from ..serializers import ArtifactDashboardSerializer
from notes.models import Note
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
    OpenApiTypes,
)


@extend_schema(
    operation_id="retrieve_artifact_dashboard",
    summary="Retrieve the dashboard for a specific artifact by name",
    description=(
        "Allows an authenticated user to retrieve the dashboard of an Artifact by "
        "specifying its name and (optionally) a subtype. Returns a 200 response with "
        "the artifact's dashboard if successful, 401 if the user is not authenticated, "
        "400 if the provided subtype does not exist, and 404 if the artifact does not "
        "exist or is not accessible to the user."
    ),
    parameters=[
        OpenApiParameter(
            name="artifact_name",
            description="Name of the artifact (path parameter)",
            required=True,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.PATH,
        ),
        OpenApiParameter(
            name="subtype",
            description="Optional subtype of the artifact (query parameter). If provided, "
            "it must match an existing EntryClass subtype.",
            required=False,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
        ),
    ],
    responses={
        200: OpenApiResponse(
            response=ArtifactDashboardSerializer,
            description="Successful retrieval of the artifact dashboard.",
            examples=[
                OpenApiExample(
                    name="Successful Artifact Dashboard",
                    value={
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "MyArtifact",
                        "description": "Some artifact description.",
                        "type": "ArtifactType",
                        "subtype": "ArtifactSubType",
                        "notes": [
                            {
                                "id": 1,
                                "content": "This is a note content that may be truncated.",
                                "publishable": True,
                                "timestamp": "2025-01-01T12:34:56Z",
                                "files": [
                                    {
                                        "file_id": "abc123",
                                        "file_name": "example.pdf",
                                        "file_url": "https://example.com/example.pdf",
                                    }
                                ],
                            }
                        ],
                        "entities": [],
                        "inaccessible_entities": [],
                        "second_hop_lazyload": True,
                    },
                )
            ],
        ),
        400: OpenApiResponse(
            description="Artifact subtype does not exist.",
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Bad Subtype Example",
                    value="There is no artifact with specified subtype",
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
            description=(
                "Artifact not found (by name/subtype) or not referenced in any of the "
                "user’s accessible notes."
            ),
            response=OpenApiTypes.STR,
            examples=[
                OpenApiExample(
                    name="Artifact Not Found",
                    value="There is no artifact with specified name",
                )
            ],
        ),
    },
)
class ArtifactDashboard(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, artifact_name: str) -> Response:
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

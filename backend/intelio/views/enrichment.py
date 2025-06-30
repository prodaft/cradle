from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, extend_schema_view

from ..utils import get_or_default_enricher

from ..models.base import BaseEnricher

from ..serializers import EnrichmentSettingsSerializer, EnrichmentSubclassSerializer
from user.permissions import HasAdminRole


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_subclasses_list",
        summary="Get enrichment subclasses",
        description="Returns a list of all subclasses of BaseEnricher with their names.",
        responses={
            200: EnrichmentSubclassSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have admin role"},
        },
    )
)
class EnrichmentSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request, *args, **kwargs):
        subclasses = BaseEnricher.__subclasses__()

        subclass_data = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        serializer = EnrichmentSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_settings_retrieve",
        summary="Get enrichment settings",
        description="Get enrichment settings for a specific enricher type.",
        responses={
            200: EnrichmentSettingsSerializer,
            404: {"description": "Enricher type not found"},
        },
    ),
    post=extend_schema(
        operation_id="enrichment_settings_update",
        summary="Update enrichment settings",
        description="Create or update enrichment settings for a specific enricher type.",
        request=EnrichmentSettingsSerializer,
        responses={
            200: EnrichmentSettingsSerializer,
            404: {"description": "Enricher type not found"},
            400: {"description": "Bad request"},
        },
    ),
)
class EnrichmentSettingsAPIView(GenericAPIView):
    """
    Get, create and update enrichment settings
    """

    serializer_class = EnrichmentSettingsSerializer

    def get(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)

        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(self.get_serializer(enricher).data)

    def post(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)
        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(enricher, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(enricher_type=enricher_type)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

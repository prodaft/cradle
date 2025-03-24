from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from ..utils import get_or_default_enricher

from ..models.base import BaseEnricher

from ..serializers import EnrichmentSettingsSerializer
from user.permissions import HasAdminRole


class EnrichmentSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request, *args, **kwargs):
        subclasses = BaseEnricher.__subclasses__()

        subclass_names = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]
        return Response(subclass_names)


class EnrichmentSettingsAPIView(APIView):
    """
    Get, create and update enrichment settings
    """

    def get(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)

        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(EnrichmentSettingsSerializer(enricher).data)

    def post(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)
        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EnrichmentSettingsSerializer(
            enricher, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save(enricher_type=enricher_type)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# TODO: Endpoint to enrich a given entry/all connected artifacts to an entity

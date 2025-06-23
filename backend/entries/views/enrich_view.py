from typing import cast
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter

from user.models import CradleUser

from ..models import Entry
from rest_framework.permissions import IsAuthenticated
from intelio.tasks import enrich_entries
from ..serializers import (
    EnricherListSerializer,
    EnricherRequestSerializer,
    EnricherResponseSerializer,
)


class EntryEnrichersView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EnricherRequestSerializer

    @extend_schema(
        description="Get available enrichers for an entry",
        responses={200: EnricherListSerializer(many=True)},
        parameters=[
            OpenApiParameter(
                name="entry_id",
                location=OpenApiParameter.PATH,
                description="UUID of the entry",
                required=True,
                type=str,
            ),
        ],
    )
    def get(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        enrichers = entry.entry_class.enrichers.filter(enabled=True)

        enriched_list = [
            {"name": e.enricher.display_name, "id": e.id} for e in enrichers
        ]

        serializer = EnricherListSerializer(enriched_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        description="Enrich an entry with a specific enricher",
        request=EnricherRequestSerializer,
        responses={
            200: EnricherResponseSerializer,
            400: EnricherResponseSerializer,
            404: EnricherResponseSerializer,
            500: EnricherResponseSerializer,
        },
        parameters=[
            OpenApiParameter(
                name="entry_id",
                location=OpenApiParameter.PATH,
                description="UUID of the entry",
                required=True,
                type=str,
            ),
        ],
    )
    def post(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        user = cast(CradleUser, request.user)

        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enricher_id = serializer.validated_data.get("enricher")

        enricher_qs = entry.entry_class.enrichers.filter(enabled=True, id=enricher_id)

        if not enricher_qs.exists():
            return Response(
                {"error": f"Enricher '{enricher_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings = enricher_qs.first()

        err = settings.enricher.pre_enrich([entry], user)

        if err:
            return Response(
                {"error": err},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        enrich_entries.apply_async(
            (
                settings.id,
                [entry.id],
                ContentType.objects.get_for_model(entry).id,
                entry.id,
                user.id,
            )
        )

        return Response(
            {"message": f"Enricher '{settings.enricher.display_name}' started."},
            status=status.HTTP_200_OK,
        )

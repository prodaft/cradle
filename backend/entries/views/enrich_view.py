from typing import cast
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from user.models import CradleUser

from ..models import Entry  # Replace with your actual app name
from rest_framework.permissions import IsAuthenticated
from intelio.tasks import enrich_entries


class EntryEnrichersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        enrichers = entry.entry_class.enrichers.filter(enabled=True)

        enriched_list = [
            {"name": e.enricher.display_name, "id": e.id} for e in enrichers
        ]

        return Response(enriched_list, status=status.HTTP_200_OK)

    def post(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        user = cast(CradleUser, request.user)

        enricher_id = request.data.get("enricher")

        if not enricher_id:
            return Response(
                {"error": "Missing 'enricher' in request body."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

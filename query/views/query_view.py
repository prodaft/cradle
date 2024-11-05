from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Subquery
from typing import cast

from entries.models import Entry
from access.models import Access
from ..serializers import EntryQuerySerializer
from entries.serializers import EntryResponseSerializer
from uuid import UUID
from entries.enums import EntryType
from notes.models import Note
from user.models import CradleUser


class QueryList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Allow a user to query for any entry they have access, by providing a name,
        a list of possible types and, if it is an Artifact, a list of possible subtypes

        Args:
            request: The request that was sent

        Returns:
            Response(body, status=200): a JSON response. The JSON response contains
            all the entries which respect the criteria specified in the query
            parameters and which are visible to the user.
            Response("Query parameters are invalid", status=400): if the provided
            query parameters are not valid.
            Response("User is not authenticated", status=401): if the user making the
            request is not authenticated.
        """

        param_serializer = EntryQuerySerializer(data=request.query_params)

        if not param_serializer.is_valid():
            return Response(
                "Query parameters are invalid", status=status.HTTP_400_BAD_REQUEST
            )

        accessible_entries = Entry.objects.all()
        if not request.user.is_superuser:
            accessible_entries = accessible_entries.filter(
                Q(
                    entry_class__type=EntryType.ENTITY,
                    id__in=Subquery(
                        Access.objects.get_accessible_entity_ids(
                            cast(UUID, request.user.id)
                        )
                    ),
                )
                | Q(
                    entry_class__type=EntryType.ARTIFACT,
                    id__in=Subquery(
                        Note.objects.get_accessible_artifact_ids(
                            cast(CradleUser, request.user)
                        )
                    ),
                )
            )

        entries = Entry.objects.get_filtered_entries(
            accessible_entries,
            param_serializer.data["entrySubtype"],
            param_serializer.data["name"],
        )

        entry_serializer = EntryResponseSerializer(entries, many=True)

        return Response(entry_serializer.data, status=status.HTTP_200_OK)

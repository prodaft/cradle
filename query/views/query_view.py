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
from query.filters import EntryFilter
from query.pagination import QueryPagination
from ..serializers import EntryQuerySerializer
from entries.serializers import EntryResponseSerializer
from uuid import UUID
from entries.enums import EntryType
from notes.models import Note
from user.models import CradleUser


class EntryListQuery(APIView):
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

        filterset = EntryFilter(request.query_params, queryset=accessible_entries)

        if filterset.is_valid():
            entries = filterset.qs
            entries = entries.order_by("timestamp")
            paginator = QueryPagination(page_size=10)
            paginated_entries = paginator.paginate_queryset(entries, request)

            if paginated_entries is not None:
                serializer = EntryResponseSerializer(paginated_entries, many=True)
                return paginator.get_paginated_response(serializer.data)

            entry_serializer = EntryResponseSerializer(entries, many=True)

            return Response(entry_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

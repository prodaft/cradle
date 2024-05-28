from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Subquery
from typing import cast

from entities.models import Entity
from access.models import Access
from ..serializers import EntityQuerySerializer
from entities.serializers.entity_serializers import EntitySerializer


class QueryList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Allow a user to query for any entity they have access, by providing a name,
        a list of possible types and, if it is an Entry, a list of possible subtypes

        Args:
            request: The request that was sent

        Returns:
            Response(body, status=200): a JSON response. The JSON response contains
            all the entities which respect the criteria specified in the query
            parameters and which are visible to the user.
            Response("Query parameters are invalid", status=400): if the provided
            query parameters are not valid.
            Response("User is not authenticated", status=401): if the user making the
            request is not authenticated.
        """

        param_serializer = EntityQuerySerializer(data=request.query_params)

        if not param_serializer.is_valid():
            return Response(
                "Query parameters are invalid", status=status.HTTP_400_BAD_REQUEST
            )

        accessible_entities = Entity.objects.all()
        if not request.user.is_superuser:
            accessible_entities = accessible_entities.filter(
                (~Q(type="case"))
                | Q(
                    type="case",
                    id__in=Subquery(
                        Access.objects.get_accessible_case_ids(
                            cast(int, request.user.pk)
                        )
                    ),
                )
            )

        entities = Entity.objects.get_filtered_entities(
            accessible_entities,
            param_serializer.data["entityType"],
            param_serializer.data["entitySubtype"],
            param_serializer.data["name"],
        )

        entity_serializer = EntitySerializer(entities, many=True)

        return Response(entity_serializer.data, status=status.HTTP_200_OK)

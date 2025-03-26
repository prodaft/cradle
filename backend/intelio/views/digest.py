from django.conf import settings
from django_lifecycle.mixins import transaction
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from core.pagination import TotalPagesPagination


from ..models.base import BaseDigest

from ..serializers import BaseDigestSerializer
from ..tasks import start_digest
from user.permissions import HasAdminRole

from django.shortcuts import get_object_or_404

import os


class DigestSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        subclasses = BaseDigest.__subclasses__()

        subclass_names = [
            {
                "class": subclass.__name__,
                "name": subclass.display_name,
                "infer_entities": getattr(subclass, "infer_entities", False),
            }
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]
        return Response(subclass_names)


class DigestAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get(self, request):
        """Fetch all digests for the current user."""
        digests = BaseDigest.objects.filter(user=request.user)
        paginator = TotalPagesPagination(page_size=10)
        result_page = paginator.paginate_queryset(digests, request)

        serializer = BaseDigestSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """Create a new digest for the current user."""
        data = request.data.copy()

        data["user"] = request.user.id

        serializer = BaseDigestSerializer(data=data)
        if serializer.is_valid():
            digest = serializer.save()
        else:
            return Response(serializer.errors, status=400)

        file = request.FILES.get("file")

        if not file:
            return Response({"detail": "Missing 'file' in request."}, status=400)

        with open(digest.path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        transaction.on_commit(lambda: start_digest.delay(digest.id))
        return Response(BaseDigestSerializer(digest).data, status=201)

    def delete(self, request):
        """
        Delete a specific digest by ID.
        Requires a query parameter: ?id=<digest_id>
        """
        digest_id = request.query_params.get("id")
        if not digest_id:
            return Response(
                {"detail": "Missing 'id' query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        digest = get_object_or_404(BaseDigest, id=digest_id, user=request.user)
        digest.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from django_lifecycle.mixins import transaction
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema

from core.pagination import TotalPagesPagination


from ..models.base import BaseDigest

from ..serializers import BaseDigestSerializer
from ..tasks import start_digest

from django.shortcuts import get_object_or_404
from user.authentication import APIKeyAuthentication


@extend_schema(
    tags=["Digest"],
    summary="Get digest subclasses",
    description="Returns a list of all subclasses of BaseDigest with their names.",
    responses={
        200: {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "class": {"type": "string"},
                    "name": {"type": "string"},
                    "infer_entities": {"type": "boolean"},
                },
            },
        },
        401: {"description": "User is not authenticated"},
    },
)
class DigestSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
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


@extend_schema(
    tags=["Digest"],
    summary="Manage digests",
    description="Create and retrieve digests for the current user.",
    responses={
        200: BaseDigestSerializer(many=True),
        401: {"description": "User is not authenticated"},
    },
)
class DigestAPIView(GenericAPIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    serializer_class = BaseDigestSerializer
    queryset = BaseDigest.objects.all()

    def get(self, request):
        """Fetch all digests for the current user."""
        digests = BaseDigest.objects.filter(user=request.user)
        paginator = TotalPagesPagination(page_size=10)
        result_page = paginator.paginate_queryset(digests, request)

        serializer = self.get_serializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """Create a new digest for the current user."""
        data = request.data.copy()

        data["user"] = request.user.id

        serializer = self.get_serializer(data=data)
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
        return Response(self.get_serializer(digest).data, status=201)

    def delete(self, request):
        """
        Delete a specific digest by ID.
        Requires a query parameter: ?id=<digest_id>
        """
        from entries.tasks import refresh_edges_materialized_view

        digest_id = request.query_params.get("id")
        if not digest_id:
            return Response(
                {"detail": "Missing 'id' query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        digest = get_object_or_404(BaseDigest, id=digest_id, user=request.user)
        digest.delete()

        refresh_edges_materialized_view.apply_async(simulate=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

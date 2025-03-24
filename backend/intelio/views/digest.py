from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from core.pagination import TotalPagesPagination


from ..models.base import BaseDigest

from ..serializers import BaseDigestSerializer
from user.permissions import HasAdminRole

from django.shortcuts import get_object_or_404

import os


class DigestSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request, *args, **kwargs):
        subclasses = BaseDigest.__subclasses__()

        subclass_names = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]
        return Response(subclass_names)


class DigestAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Fetch all digests for the current user."""
        digests = BaseDigest.objects.filter(user=request.user)
        paginator = TotalPagesPagination(page_size=10)
        result_page = paginator.paginate_queryset(digests, request)

        serializer = BaseDigestSerializer(result_page, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new digest for the current user."""
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Missing 'file' in request."}, status=400)

        # Save file to MEDIA_ROOT/digests/<user_id>/<filename>
        user_id = request.user.id
        upload_dir = os.path.join(settings.MEDIA_ROOT, "digests", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        fpath = os.path.join(upload_dir, file.name)

        with open(fpath, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # Create the Digest
        data = request.data.copy()
        data["user"] = user_id
        data["fpath"] = fpath  # set path on the model

        serializer = BaseDigestSerializer(data=data)
        if serializer.is_valid():
            digest = serializer.save()

            # Queue Celery task
            process_digest_file.delay(digest.id)

            return Response(BaseDigestSerializer(digest).data, status=201)
        return Response(serializer.errors, status=400)

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

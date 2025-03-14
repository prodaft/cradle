from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .utils import MinioClient
from .serializers import FileUploadSerializer, FileDownloadSerializer
import time
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter


@extend_schema_view(
    get=extend_schema(
        summary="Generate file upload URL",
        description="Generates a presigned URL that allows uploading a file to MinIO storage without requiring credentials. The URL expires after 5 minutes.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="fileName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file to be uploaded",
                required=True,
            )
        ],
        responses={
            200: FileUploadSerializer,
            400: {"description": "Query parameters are invalid"},
            401: {"description": "User is not authenticated"},
        },
    )
)
class FileUpload(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Generate a new UUID which concatenated with the original file
        name describe the path where the user should upload a new file.
        Provides a presigned put URL that allows the client to make this
        transfer without requiring the Minio credentials.

        Args:
            request: The request that was sent. It expects the query string
        `fileName` whose value should be the name of the file the user wants
        to upload to Minio.

        Returns:
            Response(body, status=200): a JSON response. The JSON response contains
            the name of the bucket where the resource should be placed, the file path
            inside this bucket and the presigned put URL.
            Response("Query parameters are invalid", status=400): if the user does not
            send the required query parameters.
            Response("User is not authenticated", status=401): if the user making the
            request is not authenticated.
        """

        file_name = request.query_params.get("fileName")
        if not file_name:
            return Response(
                "Query parameters are invalid", status=status.HTTP_400_BAD_REQUEST
            )

        response_data = {}
        response_data["bucket_name"] = str(request.user.id)
        response_data["expires_at"] = 5 * 60 + int(time.time())

        (
            response_data["minio_file_name"],
            response_data["presigned"],
        ) = MinioClient().create_presigned_put(
            response_data["bucket_name"], file_name, timedelta(minutes=5)
        )

        return Response(FileUploadSerializer(response_data).data)


@extend_schema_view(
    get=extend_schema(
        summary="Get file upload URL",
        description="Generates a presigned URL that allows clients to upload files to Minio without requiring credentials. The URL expires after 5 minutes.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="fileName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file to be uploaded",
                required=True,
            )
        ],
        responses={
            200: FileUploadSerializer,
            400: {"description": "Query parameters are invalid"},
            401: {"description": "User is not authenticated"},
        },
    )
)
class FileDownload(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Provides a presigned download URL that allows clients to download files
        from Minio without requiring the credentials.

        Args:
            request: The request that was sent. It expects the query strings
        `bucketName` and `minioFileName` which should contains the name of the
        Minio bucket where the file is located and the file name on Minio
        respectively.

        Returns:
            Response(body, status=200): a JSON response. The JSON response contains
            the presigned get URL.
            Response("Query parameters are invalid", status=400): if the user does not
            send the required query parameters.
            Response("User is not authenticated", status=401): if the user making the
            request is not authenticated.
            Response("The requested resource does not exist, status=404"): if the
            resource at the indicated path does not exist.
        """

        bucket_name = request.query_params.get("bucketName")
        minio_file_name = request.query_params.get("minioFileName")

        if bucket_name is None or minio_file_name is None:
            return Response(
                "Query parameters are invalid", status=status.HTTP_400_BAD_REQUEST
            )

        response_data = {}

        response_data["expires_at"] = 7 * 24 * 60 * 60 + int(time.time())
        response_data["presigned"] = MinioClient().create_presigned_get(
            bucket_name, minio_file_name, timedelta(days=7)
        )

        return Response(FileDownloadSerializer(response_data).data)

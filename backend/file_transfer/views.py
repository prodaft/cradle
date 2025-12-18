import time
from datetime import timedelta

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses

from .exceptions import (
    FileReferenceNotFoundException,
    FileTransferErrorCodes,
    InvalidFileNameException,
    InvalidRequestBodyException,
)
from .models import FileReference
from .serializers import (
    FileDownloadSerializer,
    FileProcessSerializer,
    FileUploadSerializer,
)
from .utils import MinioClient


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
            **get_error_responses(FileTransferErrorCodes.INVALID_FILE_NAME),
            **get_common_error_responses(),
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
            raise InvalidFileNameException(
                detail="The 'fileName' query parameter is required."
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
        summary="Get file download URL",
        description="Generates a presigned URL that allows clients to download files from Minio without requiring credentials. The URL expires after 7 days.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="bucketName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the bucket where the file is stored",
                required=True,
            ),
            OpenApiParameter(
                name="minioFileName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file in Minio storage",
                required=True,
            ),
        ],
        responses={
            200: FileDownloadSerializer,
            **get_error_responses(
                FileTransferErrorCodes.INVALID_FILE_NAME,
                FileTransferErrorCodes.MINIO_OBJECT_NOT_FOUND,
            ),
            **get_common_error_responses(),
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
            raise InvalidFileNameException(
                detail="Both 'bucketName' and 'minioFileName' query parameters are required."
            )

        response_data = {}

        response_data["expires_at"] = 7 * 24 * 60 * 60 + int(time.time())
        response_data["presigned"] = MinioClient().create_presigned_get(
            bucket_name, minio_file_name, timedelta(days=7)
        )

        return Response(FileDownloadSerializer(response_data).data)


@extend_schema_view(
    post=extend_schema(
        summary="Process an uploaded file",
        description="Triggers processing for a file that has been uploaded to MinIO.",
        request=FileProcessSerializer,
        responses={
            200: {"description": "File processing started successfully"},
            **get_error_responses(
                FileTransferErrorCodes.INVALID_REQUEST_BODY,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileProcess(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """Triggers processing for a file that has been uploaded to MinIO.

        Args:
            request: The request that was sent. It expects a JSON body with
            `file_id` containing the UUID of the FileReference to process.

        Returns:
            Response({"message": "File processing started"}, status=200): if processing was started successfully
            Response({"error": "Invalid request body"}, status=400): if the request body is invalid
            Response({"error": "File reference not found"}, status=404): if the file reference doesn't exist
        """
        serializer = FileProcessSerializer(data=request.data)

        if not serializer.is_valid():
            raise InvalidRequestBodyException(detail="Request body validation failed.")

        try:
            file_reference = FileReference.objects.get(
                id=serializer.validated_data["file_id"]
            )

            # Call the process_file method on the file reference
            file_reference.process_file()

            return Response(
                {"message": "File processing started"}, status=status.HTTP_200_OK
            )
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(
                detail=f"File reference with ID {serializer.validated_data['file_id']} not found."
            )


@extend_schema_view(
    delete=extend_schema(
        summary="Delete a file reference",
        description="Deletes a file reference and removes the associated file from MinIO storage.",
        parameters=[
            OpenApiParameter(
                name="fileId",
                type=str,
                location=OpenApiParameter.QUERY,
                description="UUID of the file reference to delete",
                required=True,
            )
        ],
        responses={
            200: {"description": "File reference deleted successfully"},
            **get_error_responses(
                FileTransferErrorCodes.INVALID_FILE_NAME,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileDelete(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request) -> Response:
        """Deletes a file reference and the associated file from MinIO storage.

        Args:
            request: The request that was sent. It expects the query parameter
            `fileId` containing the UUID of the FileReference to delete.

        Returns:
            Response({"message": "File deleted successfully"}, status=200): if deletion was successful
            Response({"error": "Invalid file ID"}, status=400): if the fileId parameter is missing or invalid
            Response({"error": "File reference not found"}, status=404): if the file reference doesn't exist
        """
        file_id = request.query_params.get("fileId")

        if not file_id:
            raise InvalidFileNameException(
                detail="The 'fileId' query parameter is required."
            )

        try:
            file_reference = FileReference.objects.get(id=file_id)
            file_reference.delete()

            return Response(
                {"message": "File deleted successfully"}, status=status.HTTP_200_OK
            )
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(
                detail=f"File reference with ID {file_id} not found."
            )
        except ValueError:
            raise InvalidFileNameException(
                detail="The 'fileId' parameter must be a valid UUID."
            )

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.request import Request

from ..serializers import CaseSerializer, EntryResponseSerializer
from ..models import Entry
from logs.utils import LoggingUtils
from logs.decorators import log_failed_responses

from uuid import UUID


class CaseList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def get(self, request: Request) -> Response:
        """Allow an admin to retrieve the details of all Cases

        Args:
            request: The request that was sent

        Returns:
        Response(status=200): A JSON response contained the list of all cases
            if the request was successful.
        Response("User is not authenticated.", status=401):
            if the user is not authenticated
        Response("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        cases = Entry.cases.all()
        serializer = EntryResponseSerializer(cases, many=True)

        return Response(serializer.data)

    @log_failed_responses
    def post(self, request: Request) -> Response:
        """Allow an admin to create a new Case by specifying its name

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response containing the created case
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("Bad request", status=400):
                if the provided data is not a valid case
            Response("Case with the same name already exists", status=409):
                if a case with the same name already exists
        """

        serializer = CaseSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            LoggingUtils.log_entry_creation(request)
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)


class CaseDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def delete(self, request: Request, case_id: UUID) -> Response:
        """Allow an admin to delete a Case by specifying its id

        Args:
            request: The request that was sent
            case_id: The id of the case that will be deleted

        Returns:
            Response(status=200): A JSON response containing the created case
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("There is no case with specified ID", status=404):
                if there is no case with the provided id
        """

        try:
            case = Entry.cases.get(pk=case_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no case with specified ID", status=status.HTTP_404_NOT_FOUND
            )
        case.delete()
        LoggingUtils.log_entry_deletion(request)
        return Response("Requested case was deleted", status=status.HTTP_200_OK)

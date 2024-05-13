from rest_framework.views import APIView
from django.http import HttpResponse, JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from ..serializers import CaseSerializer
from ..models import Case


class CaseList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, format=None):
        """Allow an admin to retrieve the details of all Cases

        Args:
            request: The request that was sent

        Returns:
        JsonResponse: A JSON response contained the list of all cases
            if the request was successful.
        HttpResponse("User is not authenticated.", status=401):
            if the user is not authenticated
        HttpResponse("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        cases = Case.objects.all()
        serializer = CaseSerializer(cases, many=True)

        return JsonResponse(serializer.data, safe=False)

    def post(self, request, format=None):
        """Allow an admin to create a new Case by specifying its name

        Args:
            request: The request that was sent

        Returns:
            JsonResponse: A JSON response containing the created case
                if the request was successful
            HttpResponse("User is not authenticated.", status=401):
                if the user is not authenticated
            HttpResponse("User is not an admin.", status=403):
                if the authenticated user is not an admin
            HttpResponse("Bad request", status=404):
                if the provided data is not a valid case
        """

        serializer = CaseSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, safe=False)

        return HttpResponse("Bad request", status=404)


class CaseDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, case_id, format=None):
        """Allow an admin to delete a Case by specifying its id

        Args:
            request: The request that was sent
            case_id: The id of the case that will be deleted

        Returns:
            JsonResponse: A JSON response containing the created case
                if the request was successful
            HttpResponse("User is not authenticated.", status=401):
                if the user is not authenticated
            HttpResponse("User is not an admin.", status=403):
                if the authenticated user is not an admin
            HttpResponse("There is no case with specified ID", status=404):
                if there is no case with the provided id
        """

        case = None
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            return HttpResponse("There is no case with specified ID", status=404)
        case.delete()
        return HttpResponse("Requested case was deleted", status=200)

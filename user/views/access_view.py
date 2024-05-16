from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from ..models import Access, CradleUser
from entities.models import Entity

from ..serializers import AccessSerializer


class UpdateAccess(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AccessSerializer

    def put(self, request, user_id, case_id, format=None):
        """Allows an admin to change the access priviliges of a User
            on a Case by specifying the corresponding id's.

        Args:
            request: The request that was sent
            user_id: Id of the user whose access is updated
            case_id: Id of the case to which access is updated

        Returns:
            HttpResponse("Access was updated", status=200):
                if the request was successful
            HttpResponse("Request is invalid", status=400):
                if the request body is not valid
            HttpResponse("User is not authenticated", status=401):
                if the user was not authenticated.
            HttpResponse("User is not an admin", status=403):
                if the user was not an admin.
            HttpResponse("User does not exist.", status=404):
                if the user does not exist.
            HttpResponse("Case does not exist.", status=404):
                if the case does not exist.
        """

        try:
            updated_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response("User does not exist.", status=status.HTTP_404_NOT_FOUND)

        try:
            updated_case = Entity.cases.get(id=case_id)
        except Entity.DoesNotExist:
            return Response("Case does not exist.", status=status.HTTP_404_NOT_FOUND)

        updated_access, created = Access.objects.get_or_create(
            user=updated_user, case=updated_case
        )

        serializer = AccessSerializer(updated_access, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response("Access has been updated.")

        return Response("Request is invalid", status=status.HTTP_400_BAD_REQUEST)

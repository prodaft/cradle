from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import UserCreateSerializer, UserRetrieveSerializer

from ..models import CradleUser
from logs.decorators import log_failed_responses


class UserList(APIView):

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            self.permission_classes = [IsAuthenticated, IsAdminUser]
        else:
            self.permission_classes = []
        return super().get_permissions()

    @log_failed_responses
    def get(self, request):
        """Allow an admin to view a list including all users of the application.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response containing the list of all users
            if the request was successful.
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
        """

        users = CradleUser.objects.all()
        serializer = UserRetrieveSerializer(users, many=True)
        return Response(serializer.data)

    @log_failed_responses
    def post(self, request):
        """Allows a user to create a new account,
        by sending a request with their username and password.
        This will be checked for validity and,
        if accepted, this new account will be added to the database,
        allowing the user to connect using the same credentials in the future

        Args:
            request: The request that was sent.
                The body must contain a "username" and a "password" field.

        Returns:
            Response(status=200): if the request was successful or the email is
            valid, but already exists.
            Response("Requested parameters not provided", status=400):
                if username or password was not provided
            Response("User already exists", status=409): if user already exists
        """

        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            if not CradleUser.objects.filter(
                email=serializer.validated_data["email"]
            ).exists():
                serializer.save()
            return Response(status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def delete(self, request, user_id):
        """The admin can use this to delete the account with id userId.

        Args:
            request: The request that was sent

        Returns:
            Response("Requested user account was deleted.", status=200):
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("You are not allowed to remove an admin.", status=403):
                if the admin tried to remove an admin account
            Response("There is no user with specified ID.", status=200):
                if the user specified in path does not exist
        """

        removed_user = None
        try:
            removed_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response(
                "There is no user with the specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        if removed_user.is_superuser:
            return Response(
                "You are not allowed to remove an admin.",
                status=status.HTTP_403_FORBIDDEN,
            )
        removed_user.delete()
        return Response(
            "Requested user account was deleted.", status=status.HTTP_200_OK
        )

class UserSimulate(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_tokens_for_user(self, user: CradleUser):
        refresh = RefreshToken.for_user(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @log_failed_responses
    def get(self, request, user_id, *args, **kwargs):
        """The admin can use this to get a pair of valid tokens for a given user

        Args:
            request: The request that was sent

        Returns:
            Response("Requested user account was deleted.", status=200):
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("You are not allowed to remove an admin.", status=403):
                if the admin tried to remove an admin account
            Response("There is no user with specified ID.", status=200):
                if the user specified in path does not exist
        """

        user = None
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response(
                "There is no user with the specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_superuser:
            return Response(
                "You are not allowed to simulate an admin.",
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(self.get_tokens_for_user(user), status=status.HTTP_200_OK)

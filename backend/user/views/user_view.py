from typing import cast
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from notifications.models import NewUserNotification
from user.permissions import HasAdminRole
from ..serializers import (
    ChangePasswordSerializer,
    EmailConfirmSerializer,
    UserCreateSerializer,
    UserCreateSerializerAdmin,
    UserRetrieveSerializer,
)
from ..models import CradleUser


@extend_schema_view(
    get=extend_schema(
        summary="List users",
        description="Returns a list of all users. Only available to admin users.",
        responses={
            200: UserRetrieveSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not an admin"}
        }
    ),
    post=extend_schema(
        summary="Create user", 
        description="Creates a new user account. Available to unauthenticated users.",
        request=UserCreateSerializer,
        responses={
            200: {"description": "User created successfully"},
            400: {"description": "Invalid data provided"}
        }
    )
)
class UserList(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            self.permission_classes = [IsAuthenticated, HasAdminRole]
        else:
            self.permission_classes = []
        return super().get_permissions()

    def get(self, request):
        users = CradleUser.objects.all()
        serializer = UserRetrieveSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)

        if serializer.is_valid():
            if not CradleUser.objects.filter(
                email=serializer.validated_data["email"]
            ).exists():
                user = serializer.save()
                user.send_email_confirmation()

            return Response(status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema_view(
    get=extend_schema(
        summary="Get user details",
        description="Returns details of a specific user. Regular users can only access their own details. Admin users can access details of non-admin users.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to get own details"
            )
        ],
        responses={
            200: UserRetrieveSerializer,
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to view this profile"},
            404: {"description": "User not found"}
        }
    ),
    post=extend_schema(
        summary="Update user details",
        description="Updates details of a specific user. Regular users can only update their own details. Admin users can update details of non-admin users.",
        parameters=[
            OpenApiParameter(
                name="user_id", 
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to update own details"
            )
        ],
        responses={
            200: UserRetrieveSerializer,
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to edit this profile"},
            404: {"description": "User not found"}
        }
    )
)
class UserDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                return Response(
                    "There is no user with the specified ID.",
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not (
            initiator.pk == user.pk
            or (initiator.is_cradle_admin and not user.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to view this user.",
                status=status.HTTP_403_FORBIDDEN,
            )

        json_user = UserRetrieveSerializer(user, many=False).data
        return Response(json_user, status=status.HTTP_200_OK)

    def post(self, request, user_id):
        editor = cast(CradleUser, request.user)
        edited = None

        if user_id == "me":
            edited = editor
        else:
            try:
                edited = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                return Response(
                    "There is no user with the specified ID.",
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not (
            editor.pk == edited.pk
            or (editor.is_cradle_admin and not edited.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to edit this user.",
                status=status.HTTP_403_FORBIDDEN,
            )

        if editor.is_cradle_admin and editor.pk != edited.pk:
            serializer = UserCreateSerializerAdmin(
                edited, data=request.data, partial=True
            )
        else:
            serializer = UserCreateSerializer(edited, data=request.data, partial=True)

        if serializer.is_valid():
            user = serializer.save()
            json_user = UserRetrieveSerializer(user, many=False).data
            return Response(json_user, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        deleter = cast(CradleUser, request.user)
        removed_user = None
        if user_id == "me":
            removed_user = deleter
        else:
            try:
                removed_user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                return Response(
                    "There is no user with the specified ID.",
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not (
            deleter.pk == removed_user.pk
            or (deleter.is_cradle_admin and not removed_user.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to delete this user.",
                status=status.HTTP_403_FORBIDDEN,
            )

        removed_user.delete()
        return Response(
            "Requested user account was deleted.", status=status.HTTP_200_OK
        )


@extend_schema_view(
    post=extend_schema(
        summary="Change Password",
        description="Allows authenticated users to change their password by providing their old password and a new password.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'old_password': {
                        'type': 'string',
                        'description': 'Current password of the user'
                    },
                    'new_password': {
                        'type': 'string', 
                        'description': 'New password to set'
                    }
                },
                'required': ['old_password', 'new_password']
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'detail': {
                        'type': 'string',
                        'example': 'Password changed successfully.'
                    }
                }
            },
            400: {
                'type': 'string',
                'description': 'Bad Request: Invalid data or incorrect old password'
            },
            401: {
                'type': 'string', 
                'description': 'Unauthorized: Authentication credentials were not provided'
            }
        }
    )
)
class ChangePasswordView(APIView):
    """
    An endpoint for users to change their password if they know their old password.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user: CradleUser = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            old_password = serializer.validated_data["old_password"]
            new_password = serializer.validated_data["new_password"]

            # Check if old_password is correct
            if not user.check_password(old_password):
                return Response(
                    "The old password is incorrect.",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Everything is valid, update the password
            user.set_password(new_password)
            user.save()

            return Response(
                {"detail": "Password changed successfully."}, status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        summary="Manage user actions",
        description="Perform various admin actions on a user account. Available actions: simulate, send_email_confirmation, password_reset_email",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user to perform action on"
            ),
            OpenApiParameter(
                name="action_name",
                type=str,
                location=OpenApiParameter.PATH,
                description="Action to perform: simulate, send_email_confirmation, or password_reset_email"
            )
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "refresh": {
                        "type": "string",
                        "description": "JWT refresh token (only for simulate action)"
                    },
                    "access": {
                        "type": "string", 
                        "description": "JWT access token (only for simulate action)"
                    },
                    "message": {
                        "type": "string",
                        "description": "Success message for other actions"
                    }
                }
            },
            400: {"description": "Bad Request: Unknown action or invalid state"},
            401: {"description": "Unauthorized: User is not authenticated"},
            403: {"description": "Forbidden: User is not an admin"},
            404: {"description": "Not Found: User not found"}
        }
    )
)
class ManageUser(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get_tokens_for_user(self, user: CradleUser):
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    def get(self, request, user_id, action_name, *args, **kwargs):
        if action_name not in [
            "simulate",
            "send_email_confirmation",
            "password_reset_email",
        ]:
            return Response("Unknown action", status=status.HTTP_400_BAD_REQUEST)
        return self.__getattribute__(action_name)(request, user_id, *args, **kwargs)

    def password_reset_email(self, request, user_id, *args, **kwargs):
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response(
                "There is no user with the specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        user.send_password_reset()

        return Response(
            "Password reset email has been sent.",
            status=status.HTTP_200_OK,
        )

    def send_email_confirmation(self, request, user_id, *args, **kwargs):
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response(
                "There is no user with the specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.email_confirmed:
            return Response(
                "User's email is already confirmed.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.send_email_confirmation()
        return Response(
            "Email confirmation has been sent.",
            status=status.HTTP_200_OK,
        )

    def simulate(self, request, user_id, *args, **kwargs):
        user = None
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response(
                "There is no user with the specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )
        if user.is_cradle_admin:
            return Response(
                "You are not allowed to simulate an admin.",
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(self.get_tokens_for_user(user), status=status.HTTP_200_OK)

@extend_schema_view(
    get_tokens_for_user=extend_schema(
        exclude=True
    ),
    send_password_reset=extend_schema(
        summary="Send password reset email",
        description="Sends a password reset email to the specified user.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user"
            )
        ],
        responses={
            200: {"description": "Password reset email sent successfully"},
            404: {"description": "User not found"}
        }
    ),
    send_email_confirmation=extend_schema(
        summary="Send email confirmation",
        description="Sends an email confirmation to the specified user.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str, 
                location=OpenApiParameter.PATH,
                description="UUID of the user"
            )
        ],
        responses={
            200: {"description": "Email confirmation sent successfully"},
            400: {"description": "User's email is already confirmed"},
            404: {"description": "User not found"}
        }
    ),
    simulate=extend_schema(
        summary="Simulate user login",
        description="Returns JWT tokens for the specified user. Only available for non-admin users.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH, 
                description="UUID of the user to simulate"
            )
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "refresh": {"type": "string"},
                    "access": {"type": "string"}
                }
            },
            403: {"description": "Cannot simulate admin users"},
            404: {"description": "User not found"}
        }
    )
)
class EmailConfirm(APIView):
    permission_classes = ()
    authentication_classes = ()

    def post(self, request):
        serializer = EmailConfirmSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.user

            # Check if token expired
            if user.email_confirmation_token_expiry < timezone.now():
                user.send_email_confirmation()

                return Response(
                    "Email confirmation token has expired a new one was sent.",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.email_confirmed = True
            user.email_confirmation_token = ""
            user.save()

            admins = CradleUser.objects.filter(role="admin")

            with transaction.atomic():
                for i in admins:
                    NewUserNotification.objects.create(
                        user_id=i.id,
                        new_user=user,
                        message=f"A new user has registered: {user.username}",
                    )

            return Response("Email confirmed.", status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema_view(
    post=extend_schema(
        summary="Confirm email address",
        description="Confirms a user's email address using the confirmation token sent to their email.",
        request=EmailConfirmSerializer,
        responses={
            200: {"description": "Email confirmed successfully"},
            400: {
                "description": "Invalid token provided or token expired. If token expired, a new one will be sent."
            }
        }
    )
)
class PasswordReset(APIView):
    permission_classes = ()
    authentication_classes = ()

    def post(self, request):
        email = request.data.get("email")
        username = request.data.get("username")

        if not email and not username:
            return Response(
                "Email or username must be provided", status=status.HTTP_400_BAD_REQUEST
            )

        user = None
        if email:
            user = CradleUser.objects.active().filter(email=email)
        elif username:
            user = CradleUser.objects.active().filter(username=username)

        if user.exists():
            user = user[0]
            user.send_password_reset()

        return Response("Password reset email sent.", status=status.HTTP_200_OK)

    def put(self, request):
        token = request.data.get("token")
        password = request.data.get("password")

        if not token or not password:
            return Response(
                "Token and password are required.", status=status.HTTP_400_BAD_REQUEST
            )

        if CradleUser.objects.active().filter(password_reset_token=token).exists():
            user = CradleUser.objects.active().get(password_reset_token=token)

            # Check if token was expired
            if user.password_reset_token_expiry < timezone.now():
                return Response(
                    "Password reset token has expired.",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.password_reset_token = ""
            serializer = UserCreateSerializer(
                user, data={"password": password}, partial=True
            )

            if serializer.is_valid():
                user = serializer.save()
                return Response(
                    "Password reset successfully.", status=status.HTTP_200_OK
                )

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response("Token not found!", status=status.HTTP_400_BAD_REQUEST)

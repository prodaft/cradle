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
from ..authentication import APIKeyAuthentication
from ..serializers import (
    ChangePasswordSerializer,
    EmailConfirmSerializer,
    UserCreateSerializer,
    UserCreateSerializerAdmin,
    UserRetrieveSerializer,
    APIKeyRequestSerializer,
    PasswordResetRequestSerializer,
    APIKeyResponseSerializer,
    UserManageResponseSerializer,
    ChangePasswordRequestSerializer,
    ChangePasswordResponseSerializer,
    DefaultNoteTemplateSerializer,
    DefaultNoteTemplateResponseSerializer,
)
from ..models import CradleUser
from management.settings import cradle_settings
import secrets
import bcrypt


@extend_schema_view(
    get=extend_schema(
        operation_id="users_list",
        summary="List users",
        description="Returns a list of all users. Only available to admin users.",
        responses={
            200: UserRetrieveSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not an admin"},
        },
    ),
    post=extend_schema(
        operation_id="users_create",
        summary="Create user",
        description="Creates a new user account. Available to unauthenticated users.",
        request=UserCreateSerializer,
        responses={
            200: {"description": "User created successfully"},
            400: {"description": "Invalid data provided"},
        },
    ),
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
        if not cradle_settings.users.allow_registration:
            return Response(
                "User registration is disabled.", status=status.HTTP_403_FORBIDDEN
            )

        serializer = UserCreateSerializer(data=request.data)

        if request.user and request.user.is_authenticated:
            if request.user.is_cradle_admin:  # If user is admin allow more controls
                serializer = UserCreateSerializerAdmin(data=request.data)

        if serializer.is_valid():
            if not CradleUser.objects.filter(
                email=serializer.validated_data["email"]
            ).exists():
                user = serializer.save()
                admins = CradleUser.objects.filter(role="admin")
                with transaction.atomic():
                    for i in admins:
                        NewUserNotification.objects.create(
                            user_id=i.id,
                            new_user=user,
                            message=f"A new user has registered: {user.username}",
                        )
                user.send_email_confirmation()
                serializer = UserRetrieveSerializer(user)

                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(
                    "User with this email already exists.",
                    status=status.HTTP_409_CONFLICT,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_retrieve",
        summary="Get user details",
        description="Returns details of a specific user. Regular users can only access their own details. Admin users can access details of non-admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to get own details",
            )
        ],
        responses={
            200: UserRetrieveSerializer,
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to view this profile"},
            404: {"description": "User not found"},
        },
    ),
    post=extend_schema(
        operation_id="users_update",
        summary="Update user details",
        description="Updates details of a specific user. Regular users can only update their own details. Admin users can update details of non-admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to update own details",
            )
        ],
        responses={
            200: UserRetrieveSerializer,
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to edit this profile"},
            404: {"description": "User not found"},
        },
    ),
)
class UserDetail(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = UserRetrieveSerializer

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

        if request.data.get("username", None) == edited.username:
            request.data.pop("username")

        if request.data.get("email", None) == edited.email:
            request.data.pop("email")

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
        description="Allows authenticated users to change their password by providing their old password and a new password.",  # noqa: E501
        request=ChangePasswordRequestSerializer,
        responses={
            200: ChangePasswordResponseSerializer,
            400: {
                "type": "string",
                "description": "Bad Request: Invalid data or incorrect old password",
            },
            401: {
                "type": "string",
                "description": "Unauthorized: Authentication credentials were not provided",
            },
        },
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
        description="Perform various admin actions on a user account. Available actions: simulate, send_email_confirmation, password_reset_email",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user to perform action on",
            ),
            OpenApiParameter(
                name="action_name",
                type=str,
                location=OpenApiParameter.PATH,
                description="Action to perform: simulate, send_email_confirmation, or password_reset_email",
            ),
        ],
        responses={
            200: UserManageResponseSerializer,
            400: {"description": "Bad Request: Unknown action or invalid state"},
            401: {"description": "Unauthorized: User is not authenticated"},
            403: {"description": "Forbidden: User is not an admin"},
            404: {"description": "Not Found: User not found"},
        },
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


@extend_schema(
    summary="Generate API key",
    description="Generates a new API key for the specified user. Users can only"
    + "generate keys for themselves, or admins can generate keys for non-admin users.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            type=str,
            location=OpenApiParameter.PATH,
            description="UUID of the user, or 'me' to generate key for self",
        )
    ],
    responses={
        200: APIKeyResponseSerializer,
        401: {"description": "User is not authenticated"},
        403: {"description": "User is not allowed to generate API key for this user"},
        404: {"description": "User not found"},
    },
)
class APIKey(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = APIKeyRequestSerializer

    def post(self, request, user_id):
        requesting_user = cast(CradleUser, request.user)

        if user_id == "me":
            user = requesting_user
        else:
            user = CradleUser.objects.get(id=user_id)

        if not (
            requesting_user.pk == user.pk
            or (requesting_user.is_cradle_admin and not user.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to generate API key for this user.",
                status=status.HTTP_403_FORBIDDEN,
            )

        key = secrets.token_hex(24)
        hashed_key = bcrypt.hashpw(key.encode(), bcrypt.gensalt()).decode()
        user.api_key = hashed_key
        user.save(update_fields=["api_key"])
        return Response(
            {"api_key": key},
        )


@extend_schema(
    summary="Email confirmation",
    description="Confirms a user's email using the token sent to their email address.",
    request=EmailConfirmSerializer,
    responses={
        200: {"description": "Email confirmed successfully"},
        400: {"description": "Bad request - token expired or invalid"},
    },
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

            return Response("Email confirmed.", status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_reset_password_create",
        summary="Request password reset",
        description="Sends a password reset email to the user. Requires either email or username.",
        request=PasswordResetRequestSerializer,
        responses={
            200: {"description": "Password reset email sent"},
            400: {"description": "Email or username must be provided"},
        },
    ),
    put=extend_schema(
        operation_id="users_reset_password_update",
        summary="Reset password with token",
        description="Resets user password using a valid reset token and new password.",
        responses={
            200: {"description": "Password reset successfully"},
            400: {
                "description": "Invalid token provided, token expired, or invalid password"
            },
        },
    ),
)
class PasswordReset(APIView):
    permission_classes = ()
    authentication_classes = ()
    serializer_class = PasswordResetRequestSerializer

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


@extend_schema_view(
    get=extend_schema(
        summary="Get default note template",
        description="Returns the user's default note template. Users can only retrieve their own template.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to get own template",
            )
        ],
        responses={
            200: DefaultNoteTemplateResponseSerializer,
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to view this template"},
            404: {"description": "User not found"},
        },
    ),
    post=extend_schema(
        summary="Update default note template",
        description="Updates a user's default note template. Users can only update their own template.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to update own template",
            )
        ],
        request=DefaultNoteTemplateSerializer,
        responses={
            200: DefaultNoteTemplateResponseSerializer,
            400: {"description": "Invalid data provided"},
            401: {"description": "User is not authenticated"},
            403: {"description": "User is not allowed to edit this template"},
            404: {"description": "User not found"},
        },
    ),
)
class DefaultNoteTemplateView(APIView):
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

        # Check permissions - users can only see their own template or admins can see non-admin templates
        if not (
            initiator.pk == user.pk
            or (initiator.is_cradle_admin and not user.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to view this template.",
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {"template": user.default_note_template},
            status=status.HTTP_200_OK,
        )

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

        # Check permissions - users can only edit their own template or admins can edit non-admin templates
        if not (
            editor.pk == edited.pk
            or (editor.is_cradle_admin and not edited.is_cradle_admin)
        ):
            return Response(
                "You are not allowed to edit this template.",
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DefaultNoteTemplateSerializer(data=request.data)
        if serializer.is_valid():
            edited.default_note_template = serializer.validated_data.get("template")
            edited.save(update_fields=["default_note_template"])

            return Response(
                {"template": edited.default_note_template},
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

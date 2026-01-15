import secrets
from datetime import datetime
from datetime import timezone as dt_timezone
from typing import cast

import bcrypt
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from management.settings import cradle_settings
from notifications.models import NewUserNotification
from user.permissions import HasAdminRole

from ..authentication import APIKeyAuthentication
from ..exceptions import (
    DisallowedActionException,
    EmailAlreadyConfirmedException,
    IncorrectOldPasswordException,
    RegistrationDisabledException,
    UnknownActionException,
    UserAlreadyExistsException,
    UserErrorCodes,
    UserNotFoundException,
)
from ..models import BlacklistedToken, CradleUser, UserSession
from ..serializers import (
    APIKeyRequestSerializer,
    APIKeyResponseSerializer,
    ChangePasswordRequestSerializer,
    ChangePasswordResponseSerializer,
    ChangePasswordSerializer,
    DefaultNoteTemplateResponseSerializer,
    DefaultNoteTemplateSerializer,
    EmailConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserCreateSerializer,
    UserCreateSerializerAdmin,
    UserManageResponseSerializer,
    UserRetrieveSerializer,
    UserConfigSerializer,
    UserSessionSerializer,
    UserUpdateSerializer,
)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_list",
        summary="List users",
        description="Returns a list of all users. Only available to admin users.",
        responses={
            200: UserRetrieveSerializer(many=True),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="users_create",
        summary="Create user",
        description="Creates a new user account. Only available to admin users.",
        request=UserCreateSerializerAdmin,
        responses={
            200: UserRetrieveSerializer,
            **get_validation_error_response(),
            **get_error_responses(
                UserErrorCodes.USER_ALREADY_EXISTS,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserList(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            self.permission_classes = [IsAuthenticated, HasAdminRole]
        else:
            self.permission_classes = [IsAuthenticated, HasAdminRole]
        return super().get_permissions()

    def get(self, request):
        users = CradleUser.objects.all()
        serializer = UserRetrieveSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserCreateSerializerAdmin(data=request.data)
        serializer.is_valid(raise_exception=True)

        if CradleUser.objects.filter(email=serializer.validated_data["email"]).exists():
            raise UserAlreadyExistsException(detail="User with this email already exists.")

        user = serializer.save()
        serializer = UserRetrieveSerializer(user)

        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_signup_create",
        summary="User signup",
        description="Creates a new user account. Available to unauthenticated users.",
        request=UserCreateSerializer,
        responses={
            200: UserRetrieveSerializer,
            **get_validation_error_response(),
            **get_error_responses(
                UserErrorCodes.REGISTRATION_DISABLED,
                UserErrorCodes.USER_ALREADY_EXISTS,
            ),
        },
        tags=["auth"],
    ),
)
class SignupView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if not cradle_settings.users.allow_registration:
            raise RegistrationDisabledException(detail="User registration is disabled.")

        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if CradleUser.objects.filter(email=serializer.validated_data["email"]).exists():
            raise UserAlreadyExistsException(detail="User with this email already exists.")

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


@extend_schema_view(
    get=extend_schema(
        operation_id="users_config",
        summary="Get user config",
        description="Returns OAuth configuration metadata and signup status.",
        responses={200: UserConfigSerializer},
    ),
)
class UserConfigView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        payload = {
            "oauth_methods": settings.OAUTH_METHODS,
            "signup": cradle_settings.users.allow_registration,
        }
        serializer = UserConfigSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
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
        request=UserUpdateSerializer,
        responses={
            200: UserRetrieveSerializer,
            **get_validation_error_response(),
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
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
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        if not (initiator.pk == user.pk or (initiator.is_cradle_admin and not user.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to view this user.")

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
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        if not (editor.pk == edited.pk or (editor.is_cradle_admin and not edited.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to edit this user.")

        if request.data.get("username", None) == edited.username:
            request.data.pop("username")

        if request.data.get("email", None) == edited.email:
            request.data.pop("email")

        if editor.is_cradle_admin and editor.pk != edited.pk:
            serializer = UserCreateSerializerAdmin(edited, data=request.data, partial=True)
        else:
            serializer = UserCreateSerializer(edited, data=request.data, partial=True)

        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        json_user = UserRetrieveSerializer(user, many=False).data
        return Response(json_user, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        deleter = cast(CradleUser, request.user)
        removed_user = None
        if user_id == "me":
            removed_user = deleter
        else:
            try:
                removed_user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        if not (deleter.pk == removed_user.pk or (deleter.is_cradle_admin and not removed_user.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to delete this user.")

        removed_user.delete()
        return Response("Requested user account was deleted.", status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Change Password",
        description="Allows authenticated users to change their password by providing their old password and a new password.",  # noqa: E501
        request=ChangePasswordRequestSerializer,
        responses={
            200: ChangePasswordResponseSerializer,
            **get_validation_error_response(),
            **get_error_responses(UserErrorCodes.INCORRECT_OLD_PASSWORD),
            **get_common_error_responses(),
        },
        tags=["auth"],
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
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        # Check if old_password is correct
        if not user.check_password(old_password):
            raise IncorrectOldPasswordException(detail="The old password is incorrect.")

        # Everything is valid, update the password
        user.set_password(new_password)
        user.save()

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


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
            **get_error_responses(
                UserErrorCodes.UNKNOWN_ACTION,
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.EMAIL_ALREADY_CONFIRMED,
                UserErrorCodes.DISALLOWED_ACTION,
            ),
            **get_common_error_responses(),
        },
    )
)
class ManageUser(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get_tokens_for_user(self, user: CradleUser):
        refresh = RefreshToken.for_user(user)
        # Decode access token to get expiry time
        access_expires_at = datetime.fromtimestamp(refresh.access_token["exp"], tz=dt_timezone.utc)

        # Decode refresh token to get expiry time
        refresh_expires_at = datetime.fromtimestamp(refresh["exp"], tz=dt_timezone.utc)

        return {
            "refresh": str(refresh),
            "refresh_expires_at": refresh_expires_at,
            "access": str(refresh.access_token),
            "access_expires_at": access_expires_at,
            "role": user.role,
        }

    def get(self, request, user_id, action_name, *args, **kwargs):
        if action_name not in [
            "simulate",
            "send_email_confirmation",
            "password_reset_email",
        ]:
            raise UnknownActionException(detail="Unknown action")
        return self.__getattribute__(action_name)(request, user_id, *args, **kwargs)

    def password_reset_email(self, request, user_id, *args, **kwargs):
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="There is no user with the specified ID.")

        user.send_password_reset()

        return Response(
            "Password reset email has been sent.",
            status=status.HTTP_200_OK,
        )

    def send_email_confirmation(self, request, user_id, *args, **kwargs):
        try:
            user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="There is no user with the specified ID.")

        if user.email_confirmed:
            raise EmailAlreadyConfirmedException(detail="User's email is already confirmed.")

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
            raise UserNotFoundException(detail="There is no user with the specified ID.")
        if user.is_cradle_admin:
            raise DisallowedActionException(detail="You are not allowed to simulate an admin.")
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
        **get_error_responses(
            UserErrorCodes.USER_NOT_FOUND,
            UserErrorCodes.DISALLOWED_ACTION,
        ),
        **get_common_error_responses(),
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
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        if not (requesting_user.pk == user.pk or (requesting_user.is_cradle_admin and not user.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to generate API key for this user.")

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
        **get_validation_error_response(),
    },
    tags=["auth"],
)
class EmailConfirm(APIView):
    permission_classes = ()
    authentication_classes = ()

    def post(self, request):
        serializer = EmailConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.user

        # Check if token expired
        if user.email_confirmation_token_expiry < timezone.now():
            user.send_email_confirmation()
            from core.exceptions import ValidationException

            raise ValidationException(detail="Email confirmation token has expired a new one was sent.")

        user.email_confirmed = True
        user.email_confirmation_token = ""
        user.save()

        return Response("Email confirmed.", status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_reset_password_create",
        summary="Request password reset",
        description="Sends a password reset email to the user using their email address.",
        request=PasswordResetRequestSerializer,
        responses={
            200: {"description": "Password reset email sent"},
            **get_validation_error_response(),
        },
        tags=["auth"],
    ),
    put=extend_schema(
        operation_id="auth_reset_password_update",
        summary="Reset password with token",
        description="Resets user password using a valid reset token and new password.",
        request=PasswordResetConfirmSerializer,
        responses={
            200: {"description": "Password reset successfully"},
            **get_validation_error_response(),
        },
        tags=["auth"],
    ),
)
class PasswordReset(APIView):
    permission_classes = ()
    authentication_classes = ()
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user_qs = CradleUser.objects.active().filter(email=email)

        if user_qs.exists():
            user = user_qs[0]
            user.send_password_reset()

        return Response("Password reset email sent.", status=status.HTTP_200_OK)

    def put(self, request):
        from core.exceptions import ValidationException

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        if CradleUser.objects.active().filter(password_reset_token=token).exists():
            user = CradleUser.objects.active().get(password_reset_token=token)

            # Check if token was expired
            if user.password_reset_token_expiry < timezone.now():
                raise ValidationException(detail="Password reset token has expired.")

            # Reset the token and set new password
            user.password_reset_token = ""
            user.set_password(password)
            user.save()

            return Response("Password reset successfully.", status=status.HTTP_200_OK)

        raise ValidationException(detail="Token not found!")


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
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
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
            **get_validation_error_response(),
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
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
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        # Check permissions - users can only see their own template or admins can see non-admin templates
        if not (initiator.pk == user.pk or (initiator.is_cradle_admin and not user.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to view this template.")

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
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        # Check permissions - users can only edit their own template or admins can edit non-admin templates
        if not (editor.pk == edited.pk or (editor.is_cradle_admin and not edited.is_cradle_admin)):
            raise DisallowedActionException(detail="You are not allowed to edit this template.")

        serializer = DefaultNoteTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        edited.default_note_template = serializer.validated_data.get("template")
        edited.save(update_fields=["default_note_template"])

        return Response(
            {"template": edited.default_note_template},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="users_sessions_list",
        summary="List user sessions",
        description="Returns a list of active sessions for the specified user. Users can only view their own sessions.",
        operation_id="users_sessions_list",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to list sessions for the current user",
            ),
        ],
        responses={
            200: UserSessionSerializer(many=True),
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.DISALLOWED_ACTION,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserSessionsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """List all active sessions for a user."""
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        # Users can only view their own sessions
        if initiator.pk != user.pk:
            raise DisallowedActionException(detail="You are not allowed to view sessions for this user.")

        # Get all non-expired sessions, ordered by last activity
        sessions = UserSession.objects.filter(user=user, expires_at__gt=timezone.now()).order_by("-last_activity")

        # Mark current session - we can't get refresh token from Authorization header
        # (it contains access token), so we'll rely on frontend to determine current session
        # by comparing refresh_token_jti. For now, mark all as not current.
        sessions.update(is_current=False)

        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_sessions_destroy",
        summary="Revoke user session",
        description="Revokes a specific session by ID. Users can only revoke their own sessions.",
        operation_id="users_sessions_destroy",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to revoke session for the current user",
            ),
            OpenApiParameter(
                name="session_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the session to revoke",
            ),
        ],
        responses={
            204: {"description": "Session revoked successfully"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.DISALLOWED_ACTION,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserSessionRevokeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id, session_id):
        """Revoke a specific session."""
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        # Users can only revoke their own sessions
        if initiator.pk != user.pk:
            raise DisallowedActionException(detail="You are not allowed to revoke sessions for this user.")

        try:
            session = UserSession.objects.get(id=session_id, user=user)
            # Blacklist the refresh token before deleting the session
            refresh_token_jti = session.refresh_token_jti
            expires_at = session.expires_at

            # Add token to blacklist
            BlacklistedToken.blacklist_token(refresh_token_jti, expires_at)

            # Delete the session
            session.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserSession.DoesNotExist:
            raise UserNotFoundException(detail="Session not found.")

"""User CRUD, signup, config, sessions, API key, password reset, and management views."""

import secrets
from datetime import datetime
from datetime import timezone as dt_timezone
from typing import cast
from uuid import UUID

import bcrypt
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.db.utils import IntegrityError
from django.urls import reverse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.throttling import AuthRateThrottle
from core.utils import validate_order_by
from management.settings import cradle_settings
from notifications.models import NewUserNotification

from ..authentication import APIKeyAuthentication
from ..exceptions import (
    ActionNotAllowedException,
    CurrentPasswordIncorrectException,
    EmailAlreadyConfirmedException,
    EmailConfirmationFailedException,
    InvalidPasswordResetLinkException,
    RegistrationUnavailableException,
    SessionNotFoundException,
    UnsupportedOperationException,
    UserAlreadyExistsException,
    UserErrorCodes,
    UserNotFoundException,
)
from ..filters import UserFilter
from ..models import BlacklistedToken, CradleUser, UserRoles, UserSession
from ..permissions import HasAdminRole
from ..serializers import (
    APIKeyResponseSerializer,
    ChangePasswordResponseSerializer,
    ChangePasswordSerializer,
    DefaultNoteTemplateResponseSerializer,
    DefaultNoteTemplateSerializer,
    EmailConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserConfigSerializer,
    UserCreateSerializer,
    UserCreateSerializerAdmin,
    UserManageResponseSerializer,
    UserRetrieveSerializer,
    UserSessionSerializer,
    UserUpdateSerializer,
)
from .token_view import set_token_cookies


@extend_schema_view(
    get=extend_schema(
        operation_id="users_list",
        summary="List users",
        description="Returns a paginated list of all users. Only available to admin users.",
        parameters=[
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of results per page",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(UserRetrieveSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="users_create",
        summary="Create user",
        description="Creates a new user account. Only available to admin users.",
        request=UserCreateSerializerAdmin,
        responses={
            201: UserRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.USER_ALREADY_EXISTS,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserList(ListCreateAPIView):
    """List or create users. Admin only."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    pagination_class = TotalPagesPagination
    serializer_class = UserRetrieveSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = UserFilter

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CradleUser.objects.none()
        return CradleUser.objects.all().order_by("username")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializerAdmin
        return UserRetrieveSerializer

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                if CradleUser.objects.filter(email=serializer.validated_data["email"]).exists():
                    raise UserAlreadyExistsException(detail="A user with this email already exists.")
                serializer.save()
        except IntegrityError:
            raise UserAlreadyExistsException(detail="A user with this email or username already exists.")

    def get_success_headers(self, data):
        return {"Location": self.request.build_absolute_uri(reverse("user_detail", kwargs={"user_id": data["id"]}))}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers({"id": serializer.instance.id})
        return Response(
            UserRetrieveSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_signup_create",
        summary="User signup",
        description="Creates a new user account. Available to unauthenticated users.",
        request=UserCreateSerializer,
        responses={
            201: UserRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.REGISTRATION_UNAVAILABLE,
                UserErrorCodes.USER_ALREADY_EXISTS,
                include_validation_error=True,
            ),
        },
        tags=["auth"],
    ),
)
class SignupView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        if not cradle_settings.users.allow_registration:
            raise RegistrationUnavailableException(detail="New account registration is not available.")

        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                user = serializer.save()
                admins = CradleUser.objects.filter(role=UserRoles.ADMIN)
                for i in admins:
                    NewUserNotification.objects.create(
                        user_id=i.id,
                        new_user=user,
                        message=f"A new user has registered: {user.username}",
                    )
        except IntegrityError:
            raise UserAlreadyExistsException(detail="A user with this email or username already exists.")
        user.send_email_confirmation()
        serializer = UserRetrieveSerializer(user)
        data = dict(serializer.data)
        if not user.email_confirmed:
            data["detail"] = "Please check your email for a confirmation link."
        elif not user.is_active:
            data["detail"] = "Your account must be activated by an administrator before you can log in."
        else:
            data["detail"] = "Account created successfully."

        # Signup is at /api/auth/signup/ but user resource is at /api/users/<id>/
        location = request.build_absolute_uri(reverse("user_detail", kwargs={"user_id": user.id}))
        return Response(data, status=status.HTTP_201_CREATED, headers={"Location": location})


@extend_schema_view(
    get=extend_schema(
        operation_id="auth_config",
        summary="Get auth config",
        description="Returns OAuth configuration metadata and signup status.",
        responses={
            200: UserConfigSerializer,
            **get_common_error_responses(),
        },
    ),
)
class UserConfigView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
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
        description="Returns details of a specific user. Regular users can only access their own details. Admin users can access any user's details.",  # noqa: E501
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
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
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
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="users_destroy",
        summary="Delete user",
        description="Deletes a user account. Users can delete their own account; admins can delete non-admin users.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to delete own account",
            )
        ],
        responses={
            204: {"description": "User successfully deleted"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserDetail(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id: str | UUID) -> Response:
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if not (initiator.pk == user.pk or initiator.is_cradle_admin):
            raise ActionNotAllowedException(detail="You do not have permission to view this user.")

        json_user = UserRetrieveSerializer(user).data
        return Response(json_user, status=status.HTTP_200_OK)

    def patch(self, request: Request, user_id: str | UUID) -> Response:
        editor = cast(CradleUser, request.user)
        edited = None

        if user_id == "me":
            edited = editor
        else:
            try:
                edited = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if not (editor.pk == edited.pk or (editor.is_cradle_admin and not edited.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to edit this user.")

        data = dict(request.data)
        if data.get("username") == edited.username:
            data.pop("username", None)
        if data.get("email") == edited.email:
            data.pop("email", None)

        if editor.is_cradle_admin and editor.pk != edited.pk:
            serializer = UserCreateSerializerAdmin(edited, data=data, partial=True)
        else:
            serializer = UserCreateSerializer(edited, data=data, partial=True)

        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        json_user = UserRetrieveSerializer(user).data
        return Response(json_user, status=status.HTTP_200_OK)

    def delete(self, request: Request, user_id: str | UUID) -> Response:
        deleter = cast(CradleUser, request.user)
        removed_user = None
        if user_id == "me":
            removed_user = deleter
        else:
            try:
                removed_user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if not (deleter.pk == removed_user.pk or (deleter.is_cradle_admin and not removed_user.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to delete this user.")

        with transaction.atomic():
            removed_user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_me_retrieve",
        summary="Get current user details",
        description="Returns the authenticated user's own details.",
        responses={
            200: UserRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="users_me_update",
        summary="Update current user details",
        description="Updates the authenticated user's own details.",
        request=UserUpdateSerializer,
        responses={
            200: UserRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="users_me_destroy",
        summary="Delete current user account",
        description="Deletes the authenticated user's own account.",
        responses={
            204: {"description": "User successfully deleted"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeDetail(UserDetail):
    """Same as UserDetail but with distinct operation_ids for /users/me/ to avoid schema collisions."""


@extend_schema_view(
    post=extend_schema(
        summary="Change Password",
        description="Allows authenticated users to change their password by providing their old password and a new password.",  # noqa: E501
        request=ChangePasswordSerializer,
        responses={
            200: ChangePasswordResponseSerializer,
            **get_error_responses(
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
        tags=["auth"],
    )
)
class ChangePasswordView(APIView):
    """An endpoint for users to change their password if they know their old password."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user: CradleUser = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        # Check if old_password is correct
        if not user.check_password(old_password):
            raise CurrentPasswordIncorrectException(detail="The current password is incorrect.")

        # Everything is valid, update the password
        user.set_password(new_password)
        user.save()

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_manage_create",
        summary="Manage user actions",
        description="Perform various admin actions on a user account. Available actions: simulate, send_email_confirmation, password_reset_email",  # noqa: E501
        request=None,
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' for the current user",
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
                UserErrorCodes.UNSUPPORTED_OPERATION,
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.EMAIL_ALREADY_CONFIRMED,
                UserErrorCodes.ACTION_NOT_ALLOWED,
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

    def post(self, request: Request, user_id: str | UUID, action_name: str, *args, **kwargs) -> Response:
        if action_name not in [
            "simulate",
            "send_email_confirmation",
            "password_reset_email",
        ]:
            raise UnsupportedOperationException(detail="That operation is not supported.")
        return getattr(self, action_name)(request, user_id, *args, **kwargs)

    def password_reset_email(self, request: Request, user_id: str | UUID, *args, **kwargs) -> Response:
        user = request.user if user_id == "me" else None
        if user is None:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        user.send_password_reset()

        return Response(
            {"detail": "Password reset email has been sent."},
            status=status.HTTP_200_OK,
        )

    def send_email_confirmation(self, request: Request, user_id: str | UUID, *args, **kwargs) -> Response:
        user = request.user if user_id == "me" else None
        if user is None:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if user.email_confirmed:
            raise EmailAlreadyConfirmedException(detail="This email address is already confirmed.")

        user.send_email_confirmation()
        return Response(
            {"detail": "Email confirmation has been sent."},
            status=status.HTTP_200_OK,
        )

    def simulate(self, request: Request, user_id: str | UUID, *args, **kwargs) -> Response:
        user = request.user if user_id == "me" else None
        if user is None:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")
        if user.is_cradle_admin:
            raise ActionNotAllowedException(detail="You do not have permission to impersonate an administrator.")

        token_data = self.get_tokens_for_user(user)
        response = Response(token_data, status=status.HTTP_200_OK)

        access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        set_token_cookies(response, token_data["access"], token_data["refresh"], access_max_age, refresh_max_age)

        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="users_me_manage_create",
        summary="Manage current user actions",
        description="Perform admin actions on the current user. Available actions: simulate, send_email_confirmation, password_reset_email.",
        request=None,
        parameters=[
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
                UserErrorCodes.UNSUPPORTED_OPERATION,
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.EMAIL_ALREADY_CONFIRMED,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    )
)
class UserMeManage(ManageUser):
    """Same as ManageUser but with distinct operation_id for /users/me/manage/."""


@extend_schema_view(
    post=extend_schema(
        operation_id="users_api_key_create",
        summary="Generate API key",
        description="Generates a new API key for the specified user. Users can only "
        "generate keys for themselves, or admins can generate keys for non-admin users. "
        "Regenerating invalidates any existing key.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to generate key for self",
            )
        ],
        responses={
            201: APIKeyResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="users_api_key_destroy",
        summary="Revoke API key",
        description="Revokes the API key for the specified user. Users can revoke their own key; admins can revoke non-admin users' keys.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to revoke own key",
            )
        ],
        responses={
            204: {"description": "API key revoked successfully"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class APIKey(APIView):
    serializer_class = APIKeyResponseSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_user_and_check_permission(self, requesting_user: CradleUser, user_id: str | UUID) -> CradleUser:
        if user_id == "me":
            user = requesting_user
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if not (requesting_user.pk == user.pk or (requesting_user.is_cradle_admin and not user.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to manage access keys for this user.")
        return user

    def post(self, request: Request, user_id: str | UUID) -> Response:
        user = self._get_user_and_check_permission(cast(CradleUser, request.user), user_id)
        key = secrets.token_hex(24)
        hashed_key = bcrypt.hashpw(key.encode(), bcrypt.gensalt()).decode()
        user.api_key = hashed_key
        user.save(update_fields=["api_key"])
        return Response({"api_key": key}, status=status.HTTP_201_CREATED)

    def delete(self, request: Request, user_id: str | UUID) -> Response:
        user = self._get_user_and_check_permission(cast(CradleUser, request.user), user_id)
        user.api_key = None
        user.save(update_fields=["api_key"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_me_api_key_create",
        summary="Generate API key for current user",
        description="Generates a new API key for the authenticated user.",
        responses={
            201: APIKeyResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="users_me_api_key_destroy",
        summary="Revoke API key for current user",
        description="Revokes the API key for the authenticated user.",
        responses={
            204: {"description": "API key revoked successfully"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeAPIKey(APIKey):
    """Same as APIKey but with distinct operation_ids for /users/me/api-key/."""


@extend_schema(
    summary="Email confirmation",
    description="Confirms a user's email using the token sent to their email address.",
    request=EmailConfirmSerializer,
    responses={
        200: {"description": "Email confirmed successfully"},
        **get_error_responses(
            UserErrorCodes.EMAIL_CONFIRMATION_FAILED,
            include_validation_error=True,
        ),
        **get_common_error_responses(),
    },
    tags=["auth"],
)
class EmailConfirm(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = EmailConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.user

        # Check if token expired
        if user.email_confirmation_token_expiry < timezone.now():
            user.send_email_confirmation()
            raise EmailConfirmationFailedException(
                detail="Your confirmation link has expired. A new one was sent to your email."
            )

        user.email_confirmed = True
        user.email_confirmation_token = None
        user.email_confirmation_token_expiry = None
        user.save()

        return Response({"detail": "Email confirmed."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_reset_password_create",
        summary="Request password reset",
        description="Sends a password reset email to the user using their email address.",
        request=PasswordResetRequestSerializer,
        responses={
            200: {"description": "Password reset email sent"},
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
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
            **get_error_responses(
                UserErrorCodes.INVALID_PASSWORD,
                UserErrorCodes.INVALID_PASSWORD_RESET_LINK,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
        tags=["auth"],
    ),
)
class PasswordReset(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user_qs = CradleUser.objects.active().filter(email=email)

        if user_qs.exists():
            user = user_qs[0]
            user.send_password_reset()

        return Response({"detail": "Password change email sent to your inbox!"}, status=status.HTTP_200_OK)

    def put(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        with transaction.atomic():
            try:
                user = CradleUser.objects.active().select_for_update().get(password_reset_token=token)
            except CradleUser.DoesNotExist:
                raise InvalidPasswordResetLinkException(detail="The password reset link is invalid or has expired.")

            if user.password_reset_token_expiry < timezone.now():
                raise InvalidPasswordResetLinkException(detail="The password reset link is invalid or has expired.")

            user.password_reset_token = None
            user.set_password(password)
            user.save(update_fields=["password_reset_token", "password"])

            return Response({"detail": "Password reset successfully."}, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_default_note_template_retrieve",
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
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="users_default_note_template_partial_update",
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
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class DefaultNoteTemplateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id: str | UUID) -> Response:
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        # Check permissions - users can only see their own template or admins can see non-admin templates
        if not (initiator.pk == user.pk or (initiator.is_cradle_admin and not user.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to view this template.")

        return Response(
            {"template": user.default_note_template},
            status=status.HTTP_200_OK,
        )

    def patch(self, request: Request, user_id: str | UUID) -> Response:
        editor = cast(CradleUser, request.user)
        edited = None

        if user_id == "me":
            edited = editor
        else:
            try:
                edited = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        # Check permissions - users can only edit their own template or admins can edit non-admin templates
        if not (editor.pk == edited.pk or (editor.is_cradle_admin and not edited.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to edit this template.")

        serializer = DefaultNoteTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        edited.default_note_template = serializer.validated_data["template"]
        edited.save(update_fields=["default_note_template"])

        return Response(
            {"template": edited.default_note_template},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="users_me_default_note_template_retrieve",
        summary="Get current user's default note template",
        description="Returns the authenticated user's default note template.",
        responses={
            200: DefaultNoteTemplateResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="users_me_default_note_template_partial_update",
        summary="Update current user's default note template",
        description="Updates the authenticated user's default note template.",
        request=DefaultNoteTemplateSerializer,
        responses={
            200: DefaultNoteTemplateResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeDefaultNoteTemplateView(DefaultNoteTemplateView):
    """Same as DefaultNoteTemplateView but with distinct operation_ids for /users/me/default-note-template/."""


@extend_schema_view(
    get=extend_schema(
        operation_id="users_sessions_list",
        summary="List user sessions",
        description="Returns a list of active sessions for the specified user. Users can view their own sessions; admins can view any user's sessions.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user, or 'me' to list sessions for the current user",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search sessions by device info or IP address",
                required=False,
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Comma-separated list of fields to order by. Prefix with '-' for descending. Valid fields: device_info, ip_address, created_at, last_activity, expires_at",
                required=False,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number",
                required=False,
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page size",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(UserSessionSerializer),
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserSessionsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request, user_id: str | UUID) -> Response:
        """List all active sessions for a user."""
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        if not (initiator.pk == user.pk or initiator.is_cradle_admin):
            raise ActionNotAllowedException(detail="You do not have permission to view sessions for this user.")

        # Get all non-expired sessions, ordered by last activity
        sessions = UserSession.objects.filter(user=user, expires_at__gt=timezone.now()).order_by("-last_activity")

        # Handle search parameter
        search = request.query_params.get("search")
        if search:
            sessions = sessions.filter(Q(device_info__icontains=search) | Q(ip_address__icontains=search))

        # Handle ordering
        order_by = request.query_params.get("order_by")
        if order_by:
            valid_order_fields = [
                "device_info",
                "ip_address",
                "created_at",
                "last_activity",
                "expires_at",
            ]
            order_fields = validate_order_by(order_by, valid_order_fields)
            if order_fields:
                sessions = sessions.order_by(*order_fields)

        # Mark current session using the refresh token cookie
        current_jti = None
        refresh_name = getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")
        refresh_cookie = request.COOKIES.get(refresh_name)
        if refresh_cookie:
            try:
                rt = RefreshToken(refresh_cookie)
                current_jti = rt.get("jti")
            except TokenError, InvalidToken:
                pass
        sessions.update(is_current=False)
        if current_jti:
            sessions.filter(refresh_token_jti=current_jti).update(is_current=True)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(sessions, request)
        serializer = UserSessionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_me_sessions_list",
        summary="List current user's sessions",
        description="Returns a list of active sessions for the authenticated user.",
        parameters=[
            OpenApiParameter(name="search", type=str, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="order_by", type=str, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="page", type=int, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="page_size", type=int, location=OpenApiParameter.QUERY, required=False),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                UserSessionSerializer, name="UserMeSessionsPaginatedResponse"
            ),
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeSessionsListView(UserSessionsListView):
    """Same as UserSessionsListView but with distinct operation_id for /users/me/sessions/."""


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_sessions_destroy",
        summary="Revoke user session",
        description="Revokes a specific session by ID. Users can revoke their own sessions; admins can revoke non-admin users' sessions.",
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
                UserErrorCodes.SESSION_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserSessionRevokeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, user_id: str | UUID, session_id: UUID) -> Response:
        """Revoke a specific session."""
        initiator = cast(CradleUser, request.user)
        user = None
        if user_id == "me":
            user = initiator
        else:
            try:
                user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                raise UserNotFoundException(detail="That user could not be found.")

        # Users can revoke their own sessions; admins can revoke non-admin users' sessions
        if not (initiator.pk == user.pk or (initiator.is_cradle_admin and not user.is_cradle_admin)):
            raise ActionNotAllowedException(detail="You do not have permission to revoke sessions for this user.")

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
            raise SessionNotFoundException(detail="That session could not be found.")


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_me_sessions_destroy",
        summary="Revoke current user's session",
        description="Revokes a specific session for the authenticated user.",
        parameters=[
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
                UserErrorCodes.SESSION_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeSessionRevokeView(UserSessionRevokeView):
    """Same as UserSessionRevokeView but with distinct operation_id for /users/me/sessions/{session_id}/."""

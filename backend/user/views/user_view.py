"""User CRUD, signup, config, sessions, API key, password reset, and management views."""

from typing import cast
from uuid import UUID

from django.conf import settings
from django.db import transaction
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

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.query_lang import search_q
from core.throttling import AuthRateThrottle
from core.utils import validate_order_by
from management.serializers import ManagementActionResponseSerializer
from management.settings import cradle_settings
from notifications.models import MessageNotification, NewUserNotification

from ..authentication import APIKeyAuthentication, CookieJWTAuthentication
from ..exceptions import (
    ActionNotAllowedException,
    CurrentPasswordIncorrectException,
    EmailAlreadyConfirmedException,
    EmailConfirmationFailedException,
    EmailDeliveryUnavailableException,
    InvalidPasswordResetLinkException,
    RegistrationUnavailableException,
    SessionNotFoundException,
    UserAlreadyExistsException,
    UserErrorCodes,
)
from ..filters import UserFilter
from ..models import CradleUser, UserSession
from ..permissions import HasAdminRole
from ..serializers import (
    AdminSetPasswordSerializer,
    APIKeyResponseSerializer,
    ChangePasswordResponseSerializer,
    ChangePasswordSerializer,
    DefaultNoteTemplateResponseSerializer,
    DefaultNoteTemplateSerializer,
    EmailConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    StepUpSerializer,
    TokenObtainSerializer,
    UserConfigSerializer,
    UserCreateSerializer,
    UserCreateSerializerAdmin,
    UserRetrieveSerializer,
    UserSessionSerializer,
    UserSimulateResponseSerializer,
    UserUpdateSerializer,
)
from ..utils.lookup import resolve_visible_user
from ..utils.step_up import require_step_up, validate_step_up
from ..utils.tokens import current_refresh_jti, record_session, set_token_cookies, token_expires_at


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

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
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
        auth=[],
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
                admins = CradleUser.objects.admins()
                for i in admins:
                    NewUserNotification.objects.create(
                        user_id=i.id,
                        new_user=user,
                        message=f"A new user has registered: {user.username}",
                    )
        except IntegrityError:
            raise UserAlreadyExistsException(detail="A user with this email or username already exists.")
        email_sent = user.send_email_confirmation()
        serializer = UserRetrieveSerializer(user)
        data = dict(serializer.data)
        if not user.email_confirmed:
            data["detail"] = (
                "Please check your email for a confirmation link."
                if email_sent
                else "Your account was created, but the confirmation email could not be sent. "
                "Ask an administrator to resend it."
            )
        elif not user.is_active:
            data["detail"] = "Your account must be activated by an administrator before you can log in."
        else:
            data["detail"] = "Account created successfully."

        location = request.build_absolute_uri(reverse("user_detail", kwargs={"user_id": user.id}))
        return Response(data, status=status.HTTP_201_CREATED, headers={"Location": location})


@extend_schema_view(
    get=extend_schema(
        operation_id="auth_config",
        summary="Get auth config",
        description="Returns OAuth configuration metadata and signup status.",
        auth=[],
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
        responses={
            200: UserRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="users_update",
        summary="Update user details",
        description="Updates details of a specific user. Regular users can only update their own details. Admin users can update details of non-admin users.",  # noqa: E501
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
        request=StepUpSerializer,
        responses={
            204: {"description": "User successfully deleted"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserDetail(APIView):
    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id: str | UUID) -> Response:
        initiator = cast(CradleUser, request.user)
        user = resolve_visible_user(initiator, user_id)

        json_user = UserRetrieveSerializer(user).data
        return Response(json_user, status=status.HTTP_200_OK)

    def patch(self, request: Request, user_id: str | UUID) -> Response:
        editor = cast(CradleUser, request.user)
        edited = resolve_visible_user(editor, user_id)

        if not editor.can_manage(edited):
            raise ActionNotAllowedException(detail="You do not have permission to edit this user.")

        if "password" in request.data:
            raise ActionNotAllowedException(
                detail="Passwords cannot be changed this way. Use the change password option instead."
            )

        data = dict(request.data)
        if data.get("username") == edited.username:
            data.pop("username", None)
        if data.get("email") == edited.email:
            data.pop("email", None)

        if editor.is_cradle_admin and editor.pk != edited.pk:
            serializer = UserUpdateSerializer(edited, data=data, partial=True)
        else:
            serializer = UserCreateSerializer(edited, data=data, partial=True)

        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        json_user = UserRetrieveSerializer(user).data
        return Response(json_user, status=status.HTTP_200_OK)

    def delete(self, request: Request, user_id: str | UUID) -> Response:
        user = cast(CradleUser, request.user)
        target = resolve_visible_user(user, user_id)

        if not user.can_manage(target):
            raise ActionNotAllowedException(detail="You do not have permission to delete this user.")

        validate_step_up(request, user, request.data, is_self=user.pk == target.pk)

        with transaction.atomic():
            target.delete()
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
        request=StepUpSerializer,
        responses={
            204: {"description": "User successfully deleted"},
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserMeDetail(UserDetail):
    """Same as UserDetail but with distinct operation_ids for /users/me/ to avoid schema collisions."""


@extend_schema_view(
    post=extend_schema(
        operation_id="users_me_password_create",
        summary="Change Password",
        description="Allows authenticated users to change their password by providing their old password and a new password. All other sessions are revoked.",  # noqa: E501
        request=ChangePasswordSerializer,
        responses={
            200: ChangePasswordResponseSerializer,
            **get_error_responses(
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class ChangePasswordView(APIView):
    """An endpoint for users to change their password if they know their old password."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user: CradleUser = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(old_password):
            raise CurrentPasswordIncorrectException(detail="The current password is incorrect.")

        user.change_password(new_password, keep_jti=current_refresh_jti(request))

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_password_create",
        summary="Set a user's password",
        description=(
            "Admins set a new password for another non-admin user. Requires the admin's own password (step-up). "
            "The new password must meet the password policy. All of the user's sessions are revoked and the "
            "user is notified. Users change their own password through /auth/change-password/."
        ),
        request=AdminSetPasswordSerializer,
        responses={
            200: ChangePasswordResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                UserErrorCodes.INVALID_PASSWORD,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class AdminSetPasswordView(APIView):
    """Set another user's password (admins only)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def post(self, request: Request, user_id: UUID) -> Response:
        admin = cast(CradleUser, request.user)
        target = resolve_visible_user(admin, user_id)

        if target.pk == admin.pk:
            raise ActionNotAllowedException(detail="Use the change password option to change your own password.")
        if not admin.can_manage(target):
            raise ActionNotAllowedException(detail="You do not have permission to change this user's password.")

        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        require_step_up(request, admin, serializer.validated_data.get("password") or None)

        with transaction.atomic():
            target.change_password(serializer.validated_data["new_password"])
            target.log_edit(admin, details="set a new password")
            MessageNotification.objects.create(
                user=target,
                message="An administrator set a new password for your account. You have been signed out everywhere.",
            )

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class _AdminUserAction(APIView):
    """An admin action on one user account (``POST /users/<id>/<action>/``)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]


@extend_schema_view(
    post=extend_schema(
        operation_id="users_password_reset_create",
        summary="Send password reset email",
        description="Sends the user a password reset email. Admin only.",
        request=None,
        responses={
            200: ManagementActionResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.EMAIL_DELIVERY_UNAVAILABLE,
            ),
            **get_common_error_responses(),
        },
    )
)
class UserPasswordResetEmailView(_AdminUserAction):
    def post(self, request: Request, user_id: UUID) -> Response:
        user = resolve_visible_user(request.user, user_id)
        if not user.send_password_reset():
            raise EmailDeliveryUnavailableException(detail="The email could not be sent. Try again later.")
        return Response({"detail": "Password reset email has been sent."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_email_confirmation_create",
        summary="Send email confirmation",
        description="Sends the user a new email confirmation link. Admin only.",
        request=None,
        responses={
            200: ManagementActionResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.EMAIL_ALREADY_CONFIRMED,
                UserErrorCodes.EMAIL_DELIVERY_UNAVAILABLE,
            ),
            **get_common_error_responses(),
        },
    )
)
class UserConfirmationEmailView(_AdminUserAction):
    def post(self, request: Request, user_id: UUID) -> Response:
        user = resolve_visible_user(request.user, user_id)
        if user.email_confirmed:
            raise EmailAlreadyConfirmedException(detail="This email address is already confirmed.")
        if not user.send_email_confirmation():
            raise EmailDeliveryUnavailableException(detail="The email could not be sent. Try again later.")
        return Response({"detail": "Email confirmation has been sent."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_simulate_create",
        summary="Simulate user",
        description="Signs the admin in as this (non-admin) user and ends the admin's own session. Admin only.",
        request=None,
        responses={
            200: UserSimulateResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    )
)
class UserSimulateView(_AdminUserAction):
    def post(self, request: Request, user_id: UUID) -> Response:
        user = resolve_visible_user(request.user, user_id)
        if user.is_cradle_admin:
            raise ActionNotAllowedException(detail="You do not have permission to impersonate an administrator.")

        admin_jti = current_refresh_jti(request)
        if admin_jti:
            UserSession.objects.filter(refresh_token_jti=admin_jti).revoke()

        refresh = TokenObtainSerializer.get_token(user)
        access = refresh.access_token
        record_session(request, user, refresh)
        response = Response(
            {
                "role": user.role,
                "user_id": str(user.id),
                "access_expires_at": token_expires_at(access),
                "refresh_expires_at": token_expires_at(refresh),
            },
            status=status.HTTP_200_OK,
        )

        set_token_cookies(response, access, refresh)

        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="users_api_key_create",
        summary="Generate API key",
        description="Generates a new API key for the specified user. Users can only "
        "generate keys for themselves, or admins can generate keys for non-admin users. "
        "Regenerating invalidates any existing key.",
        request=StepUpSerializer,
        responses={
            201: APIKeyResponseSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                UserErrorCodes.ACTION_NOT_ALLOWED,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="users_api_key_destroy",
        summary="Revoke API key",
        description="Revokes the API key for the specified user. Users can revoke their own key; admins can revoke non-admin users' keys.",
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
    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_user_and_check_permission(self, user: CradleUser, user_id: str | UUID) -> CradleUser:
        target = resolve_visible_user(user, user_id)

        if not user.can_manage(target):
            raise ActionNotAllowedException(detail="You do not have permission to manage access keys for this user.")
        return target

    def post(self, request: Request, user_id: str | UUID) -> Response:
        user = cast(CradleUser, request.user)
        target = self._get_user_and_check_permission(user, user_id)
        validate_step_up(
            request,
            user,
            request.data,
            is_self=user.pk == target.pk,
        )

        return Response({"api_key": target.generate_api_key()}, status=status.HTTP_201_CREATED)

    def delete(self, request: Request, user_id: str | UUID) -> Response:
        user = cast(CradleUser, request.user)
        target = self._get_user_and_check_permission(user, user_id)
        target.api_key = None
        target.save(update_fields=["api_key"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Email confirmation",
    description="Confirms a user's email using the token sent to their email address.",
    request=EmailConfirmSerializer,
    auth=[],
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

        if user.email_confirmation_token_expiry < timezone.now():
            if user.send_email_confirmation():
                detail = "Your confirmation link has expired. A new one was sent to your email."
            else:
                detail = "Your confirmation link has expired, and a new one could not be sent. Try again later."
            raise EmailConfirmationFailedException(detail=detail)

        user.email_confirmed = True
        user.email_confirmation_token = None
        user.email_confirmation_token_expiry = None
        user.save(update_fields=["email_confirmed", "email_confirmation_token", "email_confirmation_token_expiry"])

        return Response({"detail": "Email confirmed."}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_password_reset_create",
        summary="Request password reset",
        description="Sends a password reset email to the user using their email address.",
        request=PasswordResetRequestSerializer,
        auth=[],
        responses={
            200: {"description": "Password reset email sent"},
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
        },
        tags=["auth"],
    ),
)
class PasswordResetRequest(APIView):
    """Send a password reset email (same response whether or not the email exists)."""

    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user_qs = CradleUser.objects.active().filter(email=email)

        if user_qs.exists():
            user_qs[0].send_password_reset()

        return Response({"detail": "Password change email sent to your inbox!"}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_password_reset_confirm_create",
        summary="Reset password with token",
        description="Resets user password using a valid reset token and new password. All sessions are revoked.",
        request=PasswordResetConfirmSerializer,
        auth=[],
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
class PasswordResetConfirm(APIView):
    """Set a new password with a reset token; revokes every session."""

    permission_classes = ()
    authentication_classes = ()
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
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

            user.change_password(password)

            return Response({"detail": "Password reset successfully."}, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_default_note_template_retrieve",
        summary="Get default note template",
        description="Returns the user's default note template. Users can only retrieve their own template.",
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
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id: str | UUID) -> Response:
        initiator = cast(CradleUser, request.user)
        user = resolve_visible_user(initiator, user_id)

        if not initiator.can_manage(user):
            raise ActionNotAllowedException(detail="You do not have permission to view this template.")

        return Response(
            {"template": user.default_note_template},
            status=status.HTTP_200_OK,
        )

    def patch(self, request: Request, user_id: str | UUID) -> Response:
        editor = cast(CradleUser, request.user)
        edited = resolve_visible_user(editor, user_id)

        if not editor.can_manage(edited):
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
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Search sessions by device info or IP address. Supports AND/OR/NOT, -term, "
                    '"phrases", =exact and * wildcards (case-insensitive).'
                ),
                required=False,
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Comma-separated list of fields to order by. Prefix with '-' for descending. Valid fields: device_info, ip_address, created_at, last_activity_at, expires_at",
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
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class UserSessionsListView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request, user_id: str | UUID) -> Response:
        """List all active sessions for a user."""
        initiator = cast(CradleUser, request.user)
        user = resolve_visible_user(initiator, user_id)

        sessions = UserSession.objects.active().filter(user=user).order_by("-last_activity")

        search = search_q(request.query_params.get("search"), ("device_info", "ip_address"))
        if search is not None:
            sessions = sessions.filter(search)

        order_by = request.query_params.get("order_by")
        if order_by:
            valid_order_fields = {
                "device_info": "device_info",
                "ip_address": "ip_address",
                "created_at": "created_at",
                "last_activity_at": "last_activity",
                "expires_at": "expires_at",
            }
            order_fields = validate_order_by(order_by, valid_order_fields)
            if order_fields:
                sessions = sessions.order_by(*order_fields)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(sessions, request)
        serializer = UserSessionSerializer(page, many=True, context={"current_jti": current_refresh_jti(request)})
        return paginator.get_paginated_response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_me_sessions_list",
        summary="List current user's sessions",
        description="Returns a list of active sessions for the authenticated user.",
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                UserSessionSerializer, name="UserMeSessionsPaginatedResponse"
            ),
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
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
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, user_id: str | UUID, session_id: UUID) -> Response:
        """Revoke a specific session."""
        initiator = cast(CradleUser, request.user)
        user = resolve_visible_user(initiator, user_id)

        if not initiator.can_manage(user):
            raise ActionNotAllowedException(detail="You do not have permission to revoke sessions for this user.")

        if not UserSession.objects.filter(id=session_id, user=user).revoke():
            raise SessionNotFoundException(detail="That session could not be found.")
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_me_sessions_destroy",
        summary="Revoke current user's session",
        description="Revokes a specific session for the authenticated user.",
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

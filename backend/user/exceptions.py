"""User app exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class UserErrorCodes(ErrorCode):
    """Error codes for user operations."""

    USERNAME_UNAVAILABLE = (
        status.HTTP_409_CONFLICT,
        "Username Unavailable",
        "username-unavailable",
    )
    INVALID_PASSWORD = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Password",
        "invalid-password",
    )
    ACTION_NOT_ALLOWED = (
        status.HTTP_403_FORBIDDEN,
        "Action Not Allowed",
        "action-not-allowed",
    )
    USER_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "User Not Found", "user-not-found")
    EMAIL_NOT_CONFIRMED = (
        status.HTTP_401_UNAUTHORIZED,
        "Email Not Confirmed",
        "email-not-confirmed",
    )
    ACCOUNT_NOT_ACTIVATED = (
        status.HTTP_401_UNAUTHORIZED,
        "Account Not Activated",
        "account-not-activated",
    )
    TWO_FACTOR_REQUIRED = (
        status.HTTP_401_UNAUTHORIZED,
        "Two Factor Required",
        "two-factor-required",
    )
    INVALID_TWO_FACTOR_CODE = (
        status.HTTP_401_UNAUTHORIZED,
        "Invalid Two Factor Code",
        "invalid-two-factor-code",
    )
    SIGN_IN_FAILED = (
        status.HTTP_401_UNAUTHORIZED,
        "Sign In Failed",
        "sign-in-failed",
    )
    TWO_FACTOR_ALREADY_ENABLED = (
        status.HTTP_400_BAD_REQUEST,
        "Two Factor Already Enabled",
        "two-factor-already-enabled",
    )
    TWO_FACTOR_NOT_ENABLED = (
        status.HTTP_400_BAD_REQUEST,
        "Two Factor Not Enabled",
        "two-factor-not-enabled",
    )
    REGISTRATION_UNAVAILABLE = (
        status.HTTP_403_FORBIDDEN,
        "Registration Unavailable",
        "registration-unavailable",
    )
    USER_ALREADY_EXISTS = (
        status.HTTP_409_CONFLICT,
        "User Already Exists",
        "user-already-exists",
    )
    CURRENT_PASSWORD_INCORRECT = (
        status.HTTP_400_BAD_REQUEST,
        "Current Password Incorrect",
        "current-password-incorrect",
    )
    UNSUPPORTED_OPERATION = (
        status.HTTP_400_BAD_REQUEST,
        "Unsupported Operation",
        "unsupported-operation",
    )
    EMAIL_ALREADY_CONFIRMED = (
        status.HTTP_400_BAD_REQUEST,
        "Email Already Confirmed",
        "email-already-confirmed",
    )
    EXTERNAL_ACCOUNT_IN_USE = (
        status.HTTP_409_CONFLICT,
        "External Account In Use",
        "external-account-in-use",
    )
    SESSION_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Session Not Found",
        "session-not-found",
    )
    INVALID_PASSWORD_RESET_LINK = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Password Reset Link",
        "invalid-password-reset-link",
    )
    EMAIL_CONFIRMATION_FAILED = (
        status.HTTP_400_BAD_REQUEST,
        "Email Confirmation Failed",
        "email-confirmation-failed",
    )
    SESSION_RENEWAL_FAILED = (
        status.HTTP_401_UNAUTHORIZED,
        "Session Renewal Failed",
        "session-renewal-failed",
    )
    OAUTH_SIGN_IN_FAILED = (
        status.HTTP_400_BAD_REQUEST,
        "OAuth Sign In Failed",
        "oauth-sign-in-failed",
    )
    ACCOUNT_NOT_LINKED = (
        status.HTTP_400_BAD_REQUEST,
        "Account Not Linked",
        "account-not-linked",
    )


class UsernameUnavailableException(CradleAPIException):
    """Exception raised when a user with the same username already exists."""

    error_code = UserErrorCodes.USERNAME_UNAVAILABLE


class InvalidPasswordException(CradleAPIException):
    """Exception raised when password validation fails."""

    error_code = UserErrorCodes.INVALID_PASSWORD

    def __init__(self, reason: list[str], *args, **kwargs) -> None:
        detail = "The password is invalid:\n- " + "\n- ".join(reason) if reason else "The password is invalid."
        super().__init__(detail=detail, *args, **kwargs)


class ActionNotAllowedException(CradleAPIException):
    """Exception raised when a user attempts a disallowed action."""

    error_code = UserErrorCodes.ACTION_NOT_ALLOWED


class UserNotFoundException(CradleAPIException):
    """Exception raised when a user is not found."""

    error_code = UserErrorCodes.USER_NOT_FOUND


class EmailNotConfirmedException(CradleAPIException):
    """Exception raised when user's email is not confirmed."""

    error_code = UserErrorCodes.EMAIL_NOT_CONFIRMED


class AccountNotActivatedException(CradleAPIException):
    """Exception raised when user's account is not activated."""

    error_code = UserErrorCodes.ACCOUNT_NOT_ACTIVATED


class TwoFactorRequiredException(CradleAPIException):
    """Exception raised when 2FA token is required but not provided."""

    error_code = UserErrorCodes.TWO_FACTOR_REQUIRED


class InvalidTwoFactorCodeException(CradleAPIException):
    """Exception raised when the two-factor authentication code is invalid."""

    error_code = UserErrorCodes.INVALID_TWO_FACTOR_CODE


class SignInFailedException(CradleAPIException):
    """Exception raised when sign-in fails (e.g. invalid credentials)."""

    error_code = UserErrorCodes.SIGN_IN_FAILED


class TwoFactorAlreadyEnabledException(CradleAPIException):
    """Exception raised when 2FA is already enabled."""

    error_code = UserErrorCodes.TWO_FACTOR_ALREADY_ENABLED


class TwoFactorNotEnabledException(CradleAPIException):
    """Exception raised when 2FA is not enabled."""

    error_code = UserErrorCodes.TWO_FACTOR_NOT_ENABLED


class RegistrationUnavailableException(CradleAPIException):
    """Exception raised when user registration is disabled."""

    error_code = UserErrorCodes.REGISTRATION_UNAVAILABLE


class UserAlreadyExistsException(CradleAPIException):
    """Exception raised when a user with the same email already exists."""

    error_code = UserErrorCodes.USER_ALREADY_EXISTS


class CurrentPasswordIncorrectException(CradleAPIException):
    """Exception raised when the current password is wrong during a password change."""

    error_code = UserErrorCodes.CURRENT_PASSWORD_INCORRECT


class UnsupportedOperationException(CradleAPIException):
    """Exception raised when an unknown action is requested."""

    error_code = UserErrorCodes.UNSUPPORTED_OPERATION


class EmailAlreadyConfirmedException(CradleAPIException):
    """Exception raised when email is already confirmed."""

    error_code = UserErrorCodes.EMAIL_ALREADY_CONFIRMED


class ExternalAccountInUseException(CradleAPIException):
    """Exception raised when external identity is already linked elsewhere."""

    error_code = UserErrorCodes.EXTERNAL_ACCOUNT_IN_USE


class SessionNotFoundException(CradleAPIException):
    """Exception raised when a session is not found."""

    error_code = UserErrorCodes.SESSION_NOT_FOUND


class InvalidPasswordResetLinkException(CradleAPIException):
    """Exception raised when password reset token is invalid or expired."""

    error_code = UserErrorCodes.INVALID_PASSWORD_RESET_LINK


class EmailConfirmationFailedException(CradleAPIException):
    """Exception raised when email confirmation fails."""

    error_code = UserErrorCodes.EMAIL_CONFIRMATION_FAILED


class SessionRenewalFailedException(CradleAPIException):
    """Exception raised when the session could not be renewed (e.g. invalid refresh token)."""

    error_code = UserErrorCodes.SESSION_RENEWAL_FAILED


class OAuthSignInFailedException(CradleAPIException):
    """Exception raised when the sign-in flow fails (e.g. OAuth provider error)."""

    error_code = UserErrorCodes.OAUTH_SIGN_IN_FAILED


class AccountNotLinkedException(CradleAPIException):
    """Exception raised when OAuth account is not linked to any user."""

    error_code = UserErrorCodes.ACCOUNT_NOT_LINKED

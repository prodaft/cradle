from typing import List
from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException


class UserErrorCodes(ErrorCode):
    """Error codes for user operations"""

    DUPLICATE_USER = (
        status.HTTP_409_CONFLICT,
        "Duplicate User",
        "duplicate-user"
    )
    INVALID_PASSWORD = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Password",
        "invalid-password"
    )
    DISALLOWED_ACTION = (
        status.HTTP_403_FORBIDDEN,
        "Disallowed Action",
        "disallowed-action"
    )
    USER_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "User Not Found",
        "user-not-found"
    )
    EMAIL_NOT_CONFIRMED = (
        status.HTTP_401_UNAUTHORIZED,
        "Email Not Confirmed",
        "email-not-confirmed"
    )
    ACCOUNT_NOT_ACTIVATED = (
        status.HTTP_401_UNAUTHORIZED,
        "Account Not Activated",
        "account-not-activated"
    )
    TWO_FACTOR_REQUIRED = (
        status.HTTP_401_UNAUTHORIZED,
        "Two Factor Authentication Required",
        "two-factor-required"
    )
    INVALID_TWO_FACTOR_TOKEN = (
        status.HTTP_401_UNAUTHORIZED,
        "Invalid Two Factor Token",
        "invalid-two-factor-token"
    )
    TWO_FACTOR_ALREADY_ENABLED = (
        status.HTTP_400_BAD_REQUEST,
        "Two Factor Already Enabled",
        "two-factor-already-enabled"
    )
    TWO_FACTOR_NOT_ENABLED = (
        status.HTTP_400_BAD_REQUEST,
        "Two Factor Not Enabled",
        "two-factor-not-enabled"
    )
    REGISTRATION_DISABLED = (
        status.HTTP_403_FORBIDDEN,
        "Registration Disabled",
        "registration-disabled"
    )
    USER_ALREADY_EXISTS = (
        status.HTTP_409_CONFLICT,
        "User Already Exists",
        "user-already-exists"
    )
    INCORRECT_OLD_PASSWORD = (
        status.HTTP_400_BAD_REQUEST,
        "Incorrect Old Password",
        "incorrect-old-password"
    )
    UNKNOWN_ACTION = (
        status.HTTP_400_BAD_REQUEST,
        "Unknown Action",
        "unknown-action"
    )
    EMAIL_ALREADY_CONFIRMED = (
        status.HTTP_400_BAD_REQUEST,
        "Email Already Confirmed",
        "email-already-confirmed"
    )


class DuplicateUserException(CradleAPIException):
    """Exception raised when a user with the same username already exists"""
    error_code = UserErrorCodes.DUPLICATE_USER


class InvalidPasswordException(CradleAPIException):
    """Exception raised when password validation fails"""
    error_code = UserErrorCodes.INVALID_PASSWORD

    def __init__(self, reason: List[str], *args, **kwargs) -> None:
        detail = "The password is invalid:\n-" + "\n-".join(reason)
        super().__init__(detail=detail, *args, **kwargs)


class DisallowedActionException(CradleAPIException):
    """Exception raised when a user attempts a disallowed action"""
    error_code = UserErrorCodes.DISALLOWED_ACTION


class UserNotFoundException(CradleAPIException):
    """Exception raised when a user is not found"""
    error_code = UserErrorCodes.USER_NOT_FOUND


class EmailNotConfirmedException(CradleAPIException):
    """Exception raised when user's email is not confirmed"""
    error_code = UserErrorCodes.EMAIL_NOT_CONFIRMED


class AccountNotActivatedException(CradleAPIException):
    """Exception raised when user's account is not activated"""
    error_code = UserErrorCodes.ACCOUNT_NOT_ACTIVATED


class TwoFactorRequiredException(CradleAPIException):
    """Exception raised when 2FA token is required but not provided"""
    error_code = UserErrorCodes.TWO_FACTOR_REQUIRED


class InvalidTwoFactorTokenException(CradleAPIException):
    """Exception raised when 2FA token is invalid"""
    error_code = UserErrorCodes.INVALID_TWO_FACTOR_TOKEN


class TwoFactorAlreadyEnabledException(CradleAPIException):
    """Exception raised when 2FA is already enabled"""
    error_code = UserErrorCodes.TWO_FACTOR_ALREADY_ENABLED


class TwoFactorNotEnabledException(CradleAPIException):
    """Exception raised when 2FA is not enabled"""
    error_code = UserErrorCodes.TWO_FACTOR_NOT_ENABLED


class RegistrationDisabledException(CradleAPIException):
    """Exception raised when user registration is disabled"""
    error_code = UserErrorCodes.REGISTRATION_DISABLED


class UserAlreadyExistsException(CradleAPIException):
    """Exception raised when a user with the same email already exists"""
    error_code = UserErrorCodes.USER_ALREADY_EXISTS


class IncorrectOldPasswordException(CradleAPIException):
    """Exception raised when the old password is incorrect during password change"""
    error_code = UserErrorCodes.INCORRECT_OLD_PASSWORD


class UnknownActionException(CradleAPIException):
    """Exception raised when an unknown action is requested"""
    error_code = UserErrorCodes.UNKNOWN_ACTION


class EmailAlreadyConfirmedException(CradleAPIException):
    """Exception raised when email is already confirmed"""
    error_code = UserErrorCodes.EMAIL_ALREADY_CONFIRMED

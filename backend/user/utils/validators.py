"""Password validation: minimum length and character-type requirements."""

from typing import Callable

from django.contrib.auth.password_validation import MinimumLengthValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

from ..models import CradleUser


class MinimumWithConditionValidator:
    def __init__(self, min_number: int, condition: Callable[[str], bool], message: str):
        """Initializes the validator.

        Args:
            min_number (int): Minimum number of characters that must
            meet the condition.
            condition (Callable[[str], bool]): A callable that takes
            a character and returns a boolean.
            message (str): The error message to be displayed.
        """
        self.min_number = min_number
        self.condition = condition
        self.error_message = message

    def validate(self, password: str, user: CradleUser | None = None) -> None:
        """Validate that the password meets the minimum count for the condition.

        Args:
            password (str): The password to validate.
            user (CradleUser, optional): The user object. Not used in
            current implementation.

        Raises:
            ValidationError: If the password does not meet
            the minimum condition.
        """
        count = sum(1 for c in password if self.condition(c))
        if self.min_number > count:
            raise ValidationError(self.get_help_text())

    def get_help_text(self) -> str:
        """Provides the help text for the validation rule.

        Returns:
            str: A string explaining the validation rule.
        """
        return self.error_message


class MinimumUppercaseLettersValidator(MinimumWithConditionValidator):
    def __init__(self, min_upper: int):
        """Initializes the validator.

        Args:
            min_upper (int): Minimum number of characters that must be uppercase.
        """
        super().__init__(
            min_upper,
            lambda c: c.isupper(),
            _(f"Your password must contain at least {min_upper} uppercase letters."),
        )


class MinimumLowercaseLettersValidator(MinimumWithConditionValidator):
    def __init__(self, min_lower: int):
        """Initializes the validator.

        Args:
            min_lower (int): Minimum number of characters that must be lowercase.
        """
        super().__init__(
            min_lower,
            lambda c: c.islower(),
            _(f"Your password must contain at least {min_lower} lowercase letters."),
        )


class MinimumDigitsValidator(MinimumWithConditionValidator):
    def __init__(self, min_digits: int):
        """Initializes the validator.

        Args:
            min_digits (int): Minimum number of characters that must be digits.
        """
        super().__init__(
            min_digits,
            lambda c: c.isdigit(),
            _(f"Your password must contain at least {min_digits} digits."),
        )


class MinimumSpecialCharacterValidator(MinimumWithConditionValidator):
    SPECIAL_CHARACTERS: str = "!@#$%^&*"

    def __init__(self, min_special: int):
        """Initializes the validator.

        Args:
            min_special (int): Minimum number of characters that must be
            special characters.
        """
        super().__init__(
            min_special,
            lambda c: c in MinimumSpecialCharacterValidator.SPECIAL_CHARACTERS,
            _(f"Your password must contain at least {min_special} special characters."),
        )


def password_validator():
    """Return tuple of validators: 1 lower, 1 digit, 1 special, 1 upper, min length 12."""
    return (
        MinimumLowercaseLettersValidator(1),
        MinimumDigitsValidator(1),
        MinimumSpecialCharacterValidator(1),
        MinimumUppercaseLettersValidator(1),
        MinimumLengthValidator(12),
    )

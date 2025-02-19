from django.core.exceptions import ValidationError
from ..models import CradleUser
from django.utils.translation import gettext as _
from typing import Callable


class MinimumWithConditionValidator:
    def __init__(self, min_number: int, condition: Callable[[str], bool], message: str):
        """
        Initializes the validator.

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
        """
        Validates if the password meets the minimum number of characters
        that satisfy the condition.

        Args:
            password (str): The password to validate.
            user (CradleUser, optional): The user object. Not used in
            current implementation.

        Raises:
            ValidationError: If the password does not meet
            the minimum condition.
        """
        no_condition = sum(1 for c in password if self.condition(c))
        if self.min_number > no_condition:
            raise ValidationError(self.get_help_text())

    def get_help_text(self) -> str:
        """
        Provides the help text for the validation rule.

        Returns:
            str: A string explaining the validation rule.
        """
        return self.error_message


class MinimumUpperentityLettersValidator(MinimumWithConditionValidator):
    def __init__(self, min_upper: int):
        """
        Initializes the validator.

        Args:
            min_upper (int): Minimum number of characters that must be upperentity.
        """
        super().__init__(
            min_upper,
            lambda chr: chr.isupper(),
            _(f"Your password must contain at least {min_upper} upperentity letters."),
        )


class MinimumLowerentityLettersValidator(MinimumWithConditionValidator):
    def __init__(self, min_lower: int):
        """
        Initializes the validator.

        Args:
            min_lower (int): Minimum number of characters that must be lowerentity.
        """
        super().__init__(
            min_lower,
            lambda chr: chr.islower(),
            _(f"Your password must contain at least {min_lower} lowerentity letters."),
        )


class MinimumDigitsValidator(MinimumWithConditionValidator):
    def __init__(self, min_digits: int):
        """
        Initializes the validator.

        Args:
            min_digits (int): Minimum number of characters that must be digits.
        """
        super().__init__(
            min_digits,
            lambda chr: chr.isdigit(),
            _(f"Your password must contain at least {min_digits} digits."),
        )


class MinimumSpecialCharacterValidator(MinimumWithConditionValidator):
    SPECIAL_CHARACTERS: str = "!@#$%^&*"

    def __init__(self, min_special: int):
        """
        Initializes the validator.

        Args:
            min_special (int): Minimum number of characters that must be
            special characters.
        """
        super().__init__(
            min_special,
            lambda chr: chr in MinimumSpecialCharacterValidator.SPECIAL_CHARACTERS,
            _(f"Your password must contain at least {min_special} special characters."),
        )

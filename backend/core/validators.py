"""Shared validation utilities for REST API.

Provides validators for page, page_size, int, int list, choice,
and string list query parameters with consistent error handling.
"""

from .exceptions import (
    InvalidPageException,
    InvalidPageSizeException,
    InvalidRequestException,
    PageSizeTooLargeException,
)


def validate_page_param(
    value: str | None,
    param_name: str = "page",
    default: int = 1,
) -> int:
    """Validate and parse page query parameter (must be >= 1).

    Args:
        value: Raw string from query params (may be None).
        param_name: Name for error messages.
        default: Value when value is None or empty.

    Returns:
        Validated page number.

    Raises:
        InvalidPageException: When page is less than 1.
    """
    page = validate_int_param(value, param_name=param_name, default=default)
    if page < 1:
        raise InvalidPageException(detail=f'Query parameter "{param_name}" must be at least 1.')
    return page


def validate_page_size(
    page_size_str: str | None,
    default: int = 10,
    max_size: int = 200,
) -> int:
    """Validate and parse page_size query parameter.

    Args:
        page_size_str: Raw string from query params (may be None).
        default: Value when page_size_str is None or empty.
        max_size: Maximum allowed page size.

    Returns:
        Validated integer page size.

    Raises:
        InvalidPageSizeException: When value is not a positive integer.
        PageSizeTooLargeException: When value exceeds max_size.
    """
    if not page_size_str or not str(page_size_str).strip():
        page_size = default
    else:
        try:
            page_size = int(str(page_size_str).strip())
        except ValueError, TypeError:
            raise InvalidPageSizeException(detail="Page size must be a positive whole number.")

    if page_size < 1:
        raise InvalidPageSizeException(detail="Page size must be at least 1.")
    if page_size > max_size:
        raise PageSizeTooLargeException(detail=f"Page size cannot exceed {max_size}.")
    return page_size


def validate_int_param(
    value: str | None,
    param_name: str = "parameter",
    allow_negative: bool = False,
    default: int | None = None,
) -> int:
    """Validate and parse a single integer query parameter.

    Args:
        value: Raw string from query params (may be None).
        param_name: Name for error messages.
        allow_negative: Whether to allow negative integers.
        default: Value when value is None or empty. If None, raises when missing.

    Returns:
        Validated integer.

    Raises:
        InvalidRequestException: When value is missing (and no default), not a valid integer,
            or negative when allow_negative=False.
    """
    if value is None or not str(value).strip():
        if default is not None:
            return default
        raise InvalidRequestException(detail=f'Query parameter "{param_name}" is required.')
    try:
        parsed = int(str(value).strip())
    except ValueError, TypeError:
        raise InvalidRequestException(detail=f'Query parameter "{param_name}" must be a whole number.')
    if not allow_negative and parsed < 0:
        raise InvalidRequestException(detail=f'Query parameter "{param_name}" must be zero or greater.')
    return parsed


def validate_optional_int_param(
    value: str | None,
    param_name: str = "parameter",
    allow_negative: bool = False,
) -> int | None:
    """Validate and parse an optional integer query parameter.

    Args:
        value: Raw string from query params (may be None).
        param_name: Name for error messages.
        allow_negative: Whether to allow negative integers.

    Returns:
        Validated integer, or None if value is missing/empty.
    """
    if value is None or not str(value).strip():
        return None
    return validate_int_param(value, param_name=param_name, allow_negative=allow_negative)


def validate_int_list_param(
    values: list[str],
    param_name: str = "parameter",
    allow_negative: bool = False,
    max_length: int = 100,
) -> list[int]:
    """Validate and parse a list of integer query parameters.

    Args:
        values: List of raw strings from query params.
        param_name: Name for error messages.
        allow_negative: Whether to allow negative integers.
        max_length: Maximum number of values allowed (default 100).

    Returns:
        List of validated integers.

    Raises:
        InvalidRequestException: When any value is not a valid integer, list exceeds max_length,
            or any value is negative when allow_negative=False.
    """
    if len(values) > max_length:
        raise InvalidRequestException(
            detail=f'Query parameter "{param_name}" cannot have more than {max_length} values.'
        )
    result = []
    for v in values:
        try:
            parsed = int(str(v).strip())
        except ValueError, TypeError:
            raise InvalidRequestException(detail=f'Query parameter "{param_name}" must contain only whole numbers.')
        if not allow_negative and parsed < 0:
            raise InvalidRequestException(
                detail=f'Query parameter "{param_name}" must contain only non-negative whole numbers.'
            )
        result.append(parsed)
    return result


def validate_choice_param(
    value: str | None,
    choices: list[str],
    param_name: str = "parameter",
    allow_none: bool = True,
) -> str | None:
    """Validate a query parameter against allowed choices.

    Args:
        value: Raw string from query params (may be None).
        choices: List of valid choice values (e.g. [c[0] for c in MyEnum.choices]).
        param_name: Name for error messages.
        allow_none: If True, returns None when value is missing; otherwise raises.

    Returns:
        Canonical choice value or None if allow_none and value is missing.

    Raises:
        InvalidRequestException: When value is invalid or missing (when allow_none=False).
    """
    if value is None or not str(value).strip():
        if allow_none:
            return None
        raise InvalidRequestException(detail=f'Query parameter "{param_name}" is required.')
    val = str(value).strip()
    val_lower = val.lower()
    for c in choices:
        if str(c).lower() == val_lower:
            return c
    allowed = ", ".join(str(c) for c in choices)
    raise InvalidRequestException(detail=f'Query parameter "{param_name}" must be one of: {allowed}.')


def validate_str_list_param(
    values: list[str],
    param_name: str = "parameter",
    max_length: int = 100,
) -> list[str]:
    """Validate a list of string query parameters.

    Args:
        values: List of raw strings from query params.
        param_name: Name for error messages.
        max_length: Maximum number of values allowed (default 100).

    Returns:
        List of stripped non-empty strings.

    Raises:
        InvalidRequestException: When list exceeds max_length.
    """
    if len(values) > max_length:
        raise InvalidRequestException(
            detail=f'Query parameter "{param_name}" cannot have more than {max_length} values.'
        )
    return [str(v).strip() for v in values if str(v).strip()]

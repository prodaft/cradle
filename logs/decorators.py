from functools import wraps
from rest_framework.request import Request
from rest_framework.response import Response
from .utils import LoggingUtils
from rest_framework.exceptions import APIException


def create_log_decorator(log_func, condition):
    """Creates a logging decorator that calls the `log_func` function
    when the `condition` evaluates to `true`.

    Args:
        log_func: The logging function to be called.
        condition: A lambda or function that determines when to log.

    Returns:
        function: The decorated view function
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            request = get_request_from_args(*args, **kwargs)
            try:
                response = view_func(*args, **kwargs)
            except APIException as exception:
                response = Response(
                    {"detail": str(exception)}, status=exception.status_code
                )

            if condition(response):
                log_func(request, response)

            return response

        return _wrapped_view

    return decorator


def get_request_from_args(*args, **kwargs):
    """Gets the Request object from the arguments passed to the view function.

    Args:
        *args: The arguments passed to the view function
        **kwargs: The keyword arguments passed to the view function

    Returns:
        Request: The Request object if it exists in the arguments, else None
    """
    for arg in args:
        if isinstance(arg, Request):
            return arg

    return None


def log_login_success(view_func):
    """Decorator that logs successful login attempts.

    Args:
        view_func: The view function to be decorated

    Returns:
        function: The decorated view function
    """

    return create_log_decorator(
        LoggingUtils.log_login_success,
        condition=lambda response: response.status_code == 200,
    )(view_func)


def log_entry_creation(view_func):
    """Decorator that logs entry creation.

    Args:
        view_func: The view function to be decorated

    Returns:
        function: The decorated view function
    """

    return create_log_decorator(
        LoggingUtils.log_entry_creation,
        condition=lambda response: response.status_code == 200,
    )(view_func)


def log_entry_deletion(view_func):
    """Decorator that logs entry deletion.

    Args:
        view_func: The view function to be decorated

    Returns:
        function: The decorated view function
    """

    return create_log_decorator(
        LoggingUtils.log_entry_deletion,
        condition=lambda response: response.status_code == 200,
    )(view_func)


def log_failed_responses(view_func):
    """Decorator that logs failed responses.

    Args:
        view_func: The view function to be decorated

    Returns:
        function: The decorated view function
    """

    return create_log_decorator(
        LoggingUtils.log_failed_responses,
        condition=lambda response: 400 <= response.status_code <= 599,
    )(view_func)

import logging
from datetime import datetime
from rest_framework.request import Request
from rest_framework.response import Response
from typing import Optional

success_logger = logging.getLogger("django.success")
error_logger = logging.getLogger("django.error")


class LoggingUtils:
    @staticmethod
    def __format_nginx_log(request: Request, status: int, message: str):
        """Formats log messages in Nginx style

        Args:
            request: The request object
            status: The response status code
            message: The message that will be written in the log

        Returns:
            str: The formatted log message
        """
        remote_addr = request.META.get("REMOTE_ADDR", "-")
        timestamp = datetime.now().strftime("%d/%b/%Y:%H:%M:%S %z")
        request_line = (
            f"{request.method} {request.path} "
            + f'{request.META.get("SERVER_PROTOCOL", "HTTP/1.1")}'
        )
        user_agent = request.META.get("HTTP_USER_AGENT", "-")

        return (
            f'{remote_addr} - {request.user} [{timestamp}] "{request_line}" '
            + f'{status} "{user_agent}" {message}'
        )

    @staticmethod
    def log_login_success(request: Request, response: Optional[Response] = None):
        """Logs successful user login

        Args:
            request: The request object
            data (dict): The data sent in the request
        """
        username = request.data.get("username", "unknown")
        message = f"User: {username} logged in successfully"
        log_artifact = LoggingUtils.__format_nginx_log(request, 200, message)
        success_logger.warning(log_artifact)

    @staticmethod
    def log_entryclass_creation(request: Request, response: Optional[Response] = None):
        """Logs successful entry creation

        Args:
            request: The request object
            data (dict): The data sent in the request
        """

        name = request.data.get("name", "unknown")
        message = f"created Entry Class: {name} successfully"
        log_artifact = LoggingUtils.__format_nginx_log(request, 200, message)
        success_logger.warning(log_artifact)

    @staticmethod
    def log_entryclass_deletion(request: Request, response: Optional[Response] = None):
        """Logs successful entry deletion

        Args:
            request: The request object
        """
        message = "deleted Entry class successfully"
        log_artifact = LoggingUtils.__format_nginx_log(request, 200, message)
        success_logger.warning(log_artifact)

    @staticmethod
    def log_entry_creation(request: Request, response: Optional[Response] = None):
        """Logs successful entry creation

        Args:
            request: The request object
            data (dict): The data sent in the request
        """

        name = request.data.get("name", "unknown")
        message = f"created Entry: {name} successfully"
        log_artifact = LoggingUtils.__format_nginx_log(request, 200, message)
        success_logger.warning(log_artifact)

    @staticmethod
    def log_entry_deletion(request: Request, response: Optional[Response] = None):
        """Logs successful entry deletion

        Args:
            request: The request object
        """
        message = "deleted Entry successfully"
        log_artifact = LoggingUtils.__format_nginx_log(request, 200, message)
        success_logger.warning(log_artifact)

    @staticmethod
    def log_failed_responses(request: Request, response: Optional[Response] = None):
        """Logs failed requests to the server

        Args:
            request: The request object
            response: The response object
        """
        assert response is not None

        message = f"failed with Status Code: {response.status_code}"
        log_artifact = LoggingUtils.__format_nginx_log(
            request, response.status_code, message
        )
        error_logger.warning(log_artifact)

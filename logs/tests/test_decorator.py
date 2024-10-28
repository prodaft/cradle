import json
from unittest.mock import patch
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.response import Response
from rest_framework.parsers import JSONParser

from .utils import LogsTestCase
from ..decorators import (
    log_login_success,
    log_entry_creation,
    log_entry_deletion,
    log_failed_responses,
)


class TestLoggingDecorators(LogsTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    @patch("logs.utils.LoggingUtils.log_login_success")
    def test_log_login_success_decorator(self, mock_log_login_success):
        response = Response({"message": "success"}, status=200)

        def mock_view(request):
            return response

        request = self.factory.post(
            "/users/login/",
            data={"username": "testuser"},
            format="json",
        )

        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.user = "test_user"
        request.data = {"username": "testuser"}

        request = Request(request, parsers=[JSONParser()])

        mock_view(request)
        mock_log_login_success.assert_called_once_with(request, response)

    @patch("logs.utils.LoggingUtils.log_entry_creation")
    def test_log_entry_creation_decorator(self, mock_log_entry_creation):
        response = Response({"message": "success"}, status=200)

        def mock_view(request):
            return response

        request = self.factory.post(
            "/entries/actors/",
            data=json.dumps({"name": "testentry"}),
            content_type="application/json",
        )
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.user = "test_user"
        request.data = {"name": "testentry"}

        request = Request(request, parsers=[JSONParser()])

        mock_view(request)
        mock_log_entry_creation.assert_called_once_with(request, response)

    @patch("logs.utils.LoggingUtils.log_entry_deletion")
    def test_log_entry_deletion_decorator(self, mock_log_entry_deletion):
        response = Response({"message": "success"}, status=200)

        def mock_view(request):
            return response

        request = self.factory.delete("/entries/actors/1/")
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.user = "test_user"
        request.data = {}

        request = Request(request, parsers=[JSONParser()])

        mock_view(request)
        mock_log_entry_deletion.assert_called_once_with(request, response)

    @patch("logs.utils.LoggingUtils.log_failed_responses")
    def test_log_failed_responses_decorator(self, mock_log_failed_responses):
        response = Response({"message": "invalid"}, status=400)

        def mock_view(request):
            return response

        request = self.factory.post("/entries/actors/")
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.user = "test_user"
        request.data = {}

        request = Request(request, parsers=[JSONParser()])

        mock_view(request)
        mock_log_failed_responses.assert_called_once_with(request, response)

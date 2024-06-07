import io
import json
from unittest.mock import patch, MagicMock
from rest_framework.test import APIRequestFactory
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from ..utils import LoggingUtils
from .utils import LogsTestCase


class TestCustomLogger(LogsTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.success_log_stream = io.StringIO()
        self.error_log_stream = io.StringIO()

    @patch("logs.utils.success_logger")
    def test_log_login_success(self, mock_success_logger):
        mock_logger = MagicMock()
        mock_success_logger.warning = mock_logger.warning
        response = Response({"message": "success"}, status=200)

        request = self.factory.post(
            "/users/login/",
            data=json.dumps({"username": "testuser"}),
            content_type="application/json",
        )

        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"

        request = Request(request, parsers=[JSONParser()])

        request.user = "test_user"

        LoggingUtils.log_login_success(request, response)

        self.assertTrue(mock_success_logger.warning.called)
        log_call_args = mock_success_logger.warning.call_args[0][0]
        self.assertIn("127.0.0.1 - test_user [", log_call_args)
        self.assertIn("POST /users/login/ HTTP/1.1", log_call_args)
        self.assertIn(
            '200 "test-agent" User: testuser logged in successfully', log_call_args
        )

    @patch("logs.utils.success_logger")
    def test_log_entity_creation(self, mock_success_logger):
        mock_logger = MagicMock()
        mock_success_logger.warning = mock_logger.warning

        response = Response({"message": "success"}, status=200)

        request = self.factory.post(
            "/entities/actors/",
            data=json.dumps({"name": "testentity"}),
            content_type="application/json",
        )
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.META["SERVER_PROTOCOL"] = "HTTP/1.1"

        request = Request(request, parsers=[JSONParser()])

        request.user = "test_user"

        LoggingUtils.log_entity_creation(request, response)

        self.assertTrue(mock_success_logger.warning.called)
        log_call_args = mock_success_logger.warning.call_args[0][0]
        self.assertIn("127.0.0.1 - test_user [", log_call_args)
        self.assertIn("POST /entities/actors/ HTTP/1.1", log_call_args)
        self.assertIn(
            '200 "test-agent" created Entity: testentity successfully', log_call_args
        )

    @patch("logs.utils.success_logger")
    def test_log_entity_deletion(self, mock_success_logger):
        mock_logger = MagicMock()
        mock_success_logger.warning = mock_logger.warning

        response = Response({"message": "success"}, status=200)

        request = self.factory.delete("/entities/actors/1/")
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.META["SERVER_PROTOCOL"] = "HTTP/1.1"

        request = Request(request, parsers=[JSONParser()])

        request.user = "test_user"

        LoggingUtils.log_entity_deletion(request, response)

        self.assertTrue(mock_success_logger.warning.called)
        log_call_args = mock_success_logger.warning.call_args[0][0]
        self.assertIn("127.0.0.1 - test_user [", log_call_args)
        self.assertIn("DELETE /entities/actors/1/ HTTP/1.1", log_call_args)
        self.assertIn('200 "test-agent" deleted Entity successfully', log_call_args)

    @patch("logs.utils.error_logger")
    def test_log_failed_responses(self, mock_error_logger):
        mock_logger = MagicMock()
        mock_error_logger.warning = mock_logger.warning

        response = Response({"message": "invalid"}, status=400)

        request = self.factory.post("/entities/actors/")
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        request.META["HTTP_USER_AGENT"] = "test-agent"
        request.META["SERVER_PROTOCOL"] = "HTTP/1.1"

        request = Request(request, parsers=[JSONParser()])

        request.user = "test_user"

        LoggingUtils.log_failed_responses(request, response)

        self.assertTrue(mock_error_logger.warning.called)
        log_call_args = mock_error_logger.warning.call_args[0][0]
        self.assertIn("127.0.0.1 - test_user [", log_call_args)
        self.assertIn("POST /entities/actors/ HTTP/1.1", log_call_args)
        self.assertIn('400 "test-agent" failed with Status Code: 400', log_call_args)

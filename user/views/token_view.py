from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from logs.decorators import log_login_success
from rest_framework.request import Request
from rest_framework.response import Response


class TokenObtainPairLogView(TokenObtainPairView):

    @log_login_success
    def post(self, request: Request, *args, **kwargs) -> Response:
        response = super().post(request, *args, **kwargs)
        return response


class TokenRefreshLogView(TokenRefreshView):

    @log_login_success
    def post(self, request: Request, *args, **kwargs) -> Response:
        """Takes a refresh type JSON web token and returns an access type
        JSON web token if the refresh token is valid.

        Args:
            request (Request): The HTTP request object. Request.data JSON
            should contain a "refresh" artifact with a refresh type JSON web
            token.

        Returns:
            Response(body, status=200): If the request is succesful. The
            body has a field "access" with the new access type JSON web
            token.
            Response(status=400): If the request body is invalid.
            Response(status=401): If the provided refresh type JSON web
            token is invalid.
        """
        return super().post(request, *args, **kwargs)

from rest_framework_simplejwt.views import TokenObtainPairView
from logs.decorators import log_login_success


class TokenObtainPairLogView(TokenObtainPairView):

    @log_login_success
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return response

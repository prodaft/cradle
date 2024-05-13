from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from user.views.admin_views import get_all_users
from user.views.user_views import create_user


@require_http_methods(["GET", "POST"])
@csrf_exempt
def route_users(request):
    """Routes the request to either the GET method which returns all users
    or to the POST method which creates a new user.

    Args:
        request: The request that was sent

    Returns:
        Check the responses for both of these methods.
    """

    if request.method == "GET":
        return get_all_users(request)
    else:
        return create_user(request)

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token

from ..decorators import user_login_required


@user_login_required()
@require_http_methods(["POST"])
def logout_user(request):
    """Allows a user to log out of their account

    Args:
        request: The request that was sent

    Returns:
        HttpResponse("User is logged out", status=200): if the request was successful
        HttpResponse(status=401): if the user was not logged in
    """

    logout(request)
    return HttpResponse("User logged out", status=200)


@csrf_exempt
@require_http_methods(["POST"])
def create_user(request):
    """Allows a user to create a new account,
        by sending a request with their username and password.
        This will be checked for validity and,
        if accepted, this new account will be added to the database,
        allowing the user to connect using the same credentials in the future

    Args:
        request: The request that was sent.
            The body must contain form-data with a "username" and a "password" field.

    Returns:
        HttpResponse("User is logged out", status=200): if the request was successful
        HttpResponse("Requested parameters not provided", status=400):
            if username or password was not provided
        HttpResponse("User already exists", status=409): if user already exists
        HttpResponse(status=405): if the request was not a POST
    """

    if not request.POST.__contains__("username") or not request.POST.__contains__(
        "password"
    ):
        return HttpResponse("Requested parameters not provided", status=400)

    username = request.POST["username"]
    password = request.POST["password"]

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        user = User.objects.create_user(username=username, password=password)
        user.save()

        return HttpResponse(status=200)

    return HttpResponse("User already exists", status=409)


@csrf_exempt
@require_http_methods(["POST"])
def login_user(request):
    """Allows a user to log into their account,
        by sending a request with their username and password.
        This will be checked for validity and,
        if accepted, this user will be logged in and a session will be created

    Args:
        request: The request that was sent.
            The body must contain form-data with a "username" and a "password" field.

    Returns:
        HttpResponse(status=200): if the request was successful
        HttpResponse("Requested parameters not provided", status=400):
            if username or password was not provided
        HttpResponse(status=401): if the credentials are invalid
        HttpResponse(status=405): if the request was not a POST
    """

    if not request.POST.__contains__("username") or not request.POST.__contains__(
        "password"
    ):
        return HttpResponse("Requested parameters not provided", status=400)

    username = request.POST["username"]
    password = request.POST["password"]
    user = authenticate(username=username, password=password)

    if user is not None:
        login(request, user)
        csrf_token = get_token(request)
        session_id = request.session.session_key
        return HttpResponse(
            headers={"csrfToken": csrf_token, "sessionId": session_id}, status=200
        )
    else:
        return HttpResponse(status=401)

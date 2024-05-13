from django.http import HttpResponse, JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods

from ..converters import UserSerializer
from ..decorators import admin_login_required


@require_http_methods(["DELETE"])
@admin_login_required()
def delete_user(request, user_id):
    """The admin can use this to delete the account with id userId.

    Args:
        request: The request that was sent

    Returns:
        HttpResponse("Requested user account was deleted.", status=200):
            if the request was successful
        HttpResponse("User is not authenticated.", status=401):
            if the user is not authenticated
        HttpResponse("User is not an admin.", status=403):
            if the authenticated user is not an admin
        HttpResponse("You are not allowed to remove an admin.", status=403):
            if the admin tried to remove an admin account
        HttpResponse("There is no user with specified ID.", status=200):
            if the user specified in path does not exist
    """

    try:
        removed_user = User.objects.get(id=user_id)
        if removed_user.is_superuser:
            return HttpResponse("You are not allowed to remove an admin.", status=403)
        removed_user.delete()
        return HttpResponse("Requested user account was deleted.")
    except User.DoesNotExist:
        return HttpResponse("There is no user with the specified ID.", status=404)


@require_http_methods(["GET"])
@admin_login_required()
def get_all_users(request):
    """Allow an admin to view a list including all users of the application.

    Args:
        request: The request that was sent

    Returns:
        JsonResponse: A JSON response contained the list of all users
        if the request was successful.
        HttpResponse("User is not authenticated.", status=401):
            if the user is not authenticated
        HttpResponse("User is not an admin.", status=403):
            if the authenticated user is not an admin
    """

    users = User.objects.all()
    users_json = UserSerializer(users, many=True).data

    return JsonResponse(users_json, safe=False)

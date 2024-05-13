from functools import wraps
from django.http import HttpResponse


def user_login_required():
    """Decorator for views that checks that the user is authenticated. Returns
    status code 401 if that is not the case. Otherwise, it calls the wrapped view.

    Returns:
        The described decorator.
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapper_view(request, *args, **kwargs):
            if request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            else:
                return HttpResponse("User is not authenticated.", status=401)

        return _wrapper_view

    return decorator


def admin_login_required():
    """Decorator for views that checks that the user is authenticated and is
    a superuser. Returns status code 401 if the user is not authenticated and
    403 if the user is not an admin. Otherwise, it calls the wrapped view.

    Returns:
        The described decorator.
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapper_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return HttpResponse("User is not authenticated.", status=401)
            elif not request.user.is_superuser:
                return HttpResponse("User is not an admin.", status=403)
            else:
                return view_func(request, *args, **kwargs)

        return _wrapper_view

    return decorator

from functools import wraps
from django.middleware.gzip import GZipMiddleware


def gzip_response(view_function):
    @wraps(view_function)
    def wrap(request, *args, **kwargs):
        response = view_function(request, *args, **kwargs)

    return wrap

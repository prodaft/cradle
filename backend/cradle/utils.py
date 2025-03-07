from functools import wraps


def gzip_response(view_function):
    @wraps(view_function)
    def wrap(request, *args, **kwargs):
        view_function(request, *args, **kwargs)

    return wrap

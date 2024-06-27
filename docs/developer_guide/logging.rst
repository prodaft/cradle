Logging
=======

Setup
-----

The logging settings are described by the ``LOGGING`` dictionary in the ``cradle/settings.py``. This overrides the default logging configuration in Django. The variable can be customized as needed to add new loggers or change the way they are handled. Currently, the configuration overrides two fields for implementing the current logging behavior:

- **handlers**: defines two ``FileHandlers``:
  - ``success_file``, that writes to ``path/success.log``.
  - ``error_file``, that writes to ``path/error.log``.
- **loggers**: defines two loggers:
  - ``django.success`` that is handled by ``success_file``.
  - ``django.error`` that is handled by ``error_file``.

The aforementioned path is calculated by the ``get_log_directory`` and is dependent on the OS and permissions of the user to specific directories.

Functionality
-------------

The logging functionality is implemented in the ``logs`` app. This is split into two separate files: ``logs/utils.py`` and ``logs/decorators.py``.

Utils
~~~~~

The ``utils.py`` file defines the ``LoggingUtils`` class. This class implements methods that add a new log record to a specific log using specific data depending on the type of action that is logged. All these methods accept two parameters: ``request: Request``, and ``response: Optional[Response]``. The second parameter is optional, and its default value is ``None``.

These methods are:

- ``log_login_success``: Logs a successful login request
- ``log_entity_creation``: Logs a successful entity creation request
- ``log_entity_deletion``:  Logs a successful entity deletion request
- ``log_failed_responses``: Logs a failed request

The ``LoggingUtils`` class additionally implements a private helper method ``__format_nginx_log`` that returns a properly formatted log entry according to the nginx style based on the provided data. All methods described previously use this method for formatting.

To extend this functionality with additional use cases, you should create a new method for each type of log entry that takes the same parameters as mentioned above and logs the desired action to the logger of choice. To keep the consistency of the code, use the ``__format_nginx_log`` method for formatting the log message and provide it the following parameters:

- ``request``: The request that is logged
- ``status``: The status of the response
- ``message``: The custom message that should be displayed

Decorators
~~~~~~~~~~

For simplicity, instead of using the ``LoggingUtils`` class directly in the view that needs to be logged, decorators have been implemented for each of the different logging behaviors.

The ``decorators.py`` file defines the following methods:

- ``create_log_decorator``: A helper method that returns a decorator. This has two parameters:
  - ``log_func``: The function that logs a specific request to the loggers. Typically one of the functions from the ``LoggingUtils`` class. Other functions may be provided, but they need to have the same signature.
  - ``condition``: A function that takes as parameter the response of the request and contains the conditions needed for the request to be logged. It returns true if the request should be logged and false otherwise.
- ``get_request_from_args``: A helper function that extracts the ``Request`` object from a list of arguments.
- The actual decorators that will be used. These have the signature of a typical decorator, that is, they receive the decorated function as a parameter ``view_func`` and return a decorator. This is done by calling the ``create_log_decorator`` method with different parameters depending on the type of action that will be logged:
  - ``log_login_success``: Decorator that logs the successful login requests
  - ``log_entity_creation``: Decorator that logs the successful entity creation requests
  - ``log_entity_deletion``: Decorator that logs the successful entity deletion requests
  - ``log_failed_responses``: Decorator that logs the failed requests

New decorators can be added as a separate method, and the implementation details are not relevant. For consistency, you can follow the current template and create a decorator using the ``create_log_decorator`` method.

Use
---

In order to use the logging functionality inside the desired views, there are two main options:

- Use the ``LoggingUtils`` methods directly in the body of the desired view where the request meets the required conditions to be logged.
- Add a decorator to the view function's signature that implements the logging behavior of choice. You can use one of the currently defined ones or define your own in the ``decorators.py`` file. To add a decorator, use the following syntax:

  .. code-block:: python

     @decorator1
     @decorator2
     ...
     def view_func(request):
         # some logic here
         return Response()

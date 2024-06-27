CRADLE File Structure
========================

The CRADLE back end is implemented using Django Rest Framework. Therefore, the project is structured with the standard Django format. This section will first provide an overview of the general structure of an app. Then, general guidelines will be provided for future contributions.

1. App Structure
----------------

CRADLE has been designed to be as modular as possible. As a consequence, Django apps are used to split logically independent features as much as possible. CRADLE currently contains the following apps:

a. Core Applications
~~~~~~~~~~~~~~~~~~~~

- **user**: handles general user logic.
- **entities**: handles general entity logic.
- **notes**: handles general note logic.


b. Additional Applications
~~~~~~~~~~~~~~~~~~~~~~~~~~

- **notifications**: handles the notification logic.
- **dashboards**: handles the retrieval and construction of dashboards.
- **fleeting_notes**: handles the logic of fleeting note creation, update, and deletion.
- **query**: handles the querying logic.
- **knowledge_graph**: handles the endpoint which retrieves the knowledge graph.

c. Applications for external services
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- **file_transfer**: handles the logic behind file upload and download. 
- **logs**: handles the logging functionality.

Core applications represent the main functionality of the application. These apps are necessary for the proper functionality of the application. Additional applications are only dependent on the core applications and thus can be removed or added freely without affecting the functionality of other apps.

2. General Guidelines
---------------------

a. Adding a New Application
~~~~~~~~~~~~~~~~~~~~~~~~~~~

For adding a new application, one can follow the standard Django tutorial for creating a new application: https://docs.djangoproject.com/en/5.0/intro/tutorial01/. Once that is finished, there are a couple of additional modifications that need to be made if one desires to test the application. These changes will be explained in detail in the Testing section.

b. Creating New Views
~~~~~~~~~~~~~~~~~~~~~

New endpoints should be added inside the ``views.py`` file. The overall approach for CRADLE has been to use class-based views, instead of method-based views to avoid high cyclomatic complexity.

Below is an example of a view which handles a sample "Hello World" GET request.

.. code-block:: python

    from rest_framework.views import APIView
    from rest_framework.request import Request
    from rest_framework.response import Response
    from rest_framework import status

    # class which handles all request on a given URL path.
    class HelloWorldList(APIView):
        # method which handles get request
        def get(request: Request) -> Response:
            return Response("Hello, world!", status=status.HTTP_200_OK)

To include the endpoint in the application, one must map the view to a given URL path. First, the general path of the application must be mapped to the ``urls.py`` specific to the application.

Including another URLconf
~~~~~~~~~~~~~~~~~~~~~~~~~

1. Import the ``include()`` function: ``from django.urls import include, path``
2. Add a URL to ``urlpatterns``: ``path('blog/', include('blog.urls'))``

.. code-block:: python

    from django.urls import include, path
    import os

    BASE_URL = (os.environ.get("BASE_URL", "").strip("/") + "/").removeprefix("/")
    urlpatterns = [
        path(
            BASE_URL,
            include(
                [
                    path("users/", include("user.urls")),
                    path("entities/", include("entities.urls")),
                    path("notes/", include("notes.urls")),
                    path("dashboards/", include("dashboards.urls")),
                    path("access/", include("access.urls")),
                    path("query/", include("query.urls")),
                    path("file-transfer/", include("file_transfer.urls")),
                    path("fleeting-notes/", include("fleeting_notes.urls")),
                    path("notifications/", include("notifications.urls")),
                    path("knowledge-graph/", include("knowledge_graph.urls")),
                    path("statistics/", include("cradle_statistics.urls")),
                    path("hellow-world/", include("newapp.urls")),
                ]
            ),
        )
    ]

Then, the ``urls.py`` file needs to be created inside the ``newapp`` application with the following code:

.. code-block:: python

    from django.urls import path
    from .views import HelloWorldList

    urlpatterns = [path("", HelloWorldList.as_view(), name="helloworld_list")]

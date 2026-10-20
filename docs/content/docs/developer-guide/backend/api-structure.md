+++
title = "API Structure"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

## Creating new views

Use class-based views in `views.py` to keep code maintainable.

```python
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

class HelloWorldList(APIView):
    def get(self, request: Request) -> Response:
        return Response("Hello, world!", status=status.HTTP_200_OK)
```

## Including URL configurations

Map your view in the app's `urls.py`:

```python
from django.urls import path
from .views import HelloWorldList

urlpatterns = [
    path("", HelloWorldList.as_view(), name="helloworld_list")
]
```

Include it in the main URL configuration:

```python
from django.urls import include, path

api_patterns = [
    path("auth/", include("user.auth_urls")),
    path("reports/", include("publish.urls")),
    path("users/", include("user.urls")),
    path("logs/", include("logs.urls")),
    path("entries/", include("entries.urls")),
    path("notes/", include("notes.urls")),
    path("teams/", include("teams.urls")),
    path("query/", include("query.urls")),
    path("files/", include("file_transfer.urls")),
    path("notifications/", include("notifications.urls")),
    path("knowledge-graph/", include("knowledge_graph.urls")),
    path("lsp/", include("lsp.urls")),
    path("intelio/", include("intelio.urls")),
    path("management/", include("management.urls")),
    path("hello-world/", include("newapp.urls")),
]

urlpatterns = [
    path("api/", include(api_patterns)),
]
```

Routes that act on another app's resource are mounted under that resource, not under their own app's prefix.
For example, entity access and ownership are served from `/entries/entities/<id>/access/...` and
`/entries/entities/<id>/owner/`: `access/entity_urls.py` and `teams/entity_urls.py` are included from
`entries/urls.py`, and a user's access list (`access/user_urls.py`) is included under `/users/<id>/access/`.

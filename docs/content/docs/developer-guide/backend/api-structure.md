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
import os

BASE_URL = (os.environ.get("BASE_URL", "").strip("/") + "/").removeprefix("/")
urlpatterns = [
    path(
        BASE_URL,
        include([
            path("users/", include("user.urls")),
            path("reports/", include("publish.urls")),
            path("logs/", include("logs.urls")),
            path("entries/", include("entries.urls")),
            path("notes/", include("notes.urls")),
            path("access/", include("access.urls")),
            path("query/", include("query.urls")),
            path("file-transfer/", include("file_transfer.urls")),
            path("fleeting-notes/", include("fleeting_notes.urls")),
            path("notifications/", include("notifications.urls")),
            path("knowledge-graph/", include("knowledge_graph.urls")),
            path("statistics/", include("cradle_statistics.urls")),
            path("lsp/", include("lsp.urls")),
            path("intelio/", include("intelio.urls")),
            path("management/", include("management.urls")),
            path("hello-world/", include("newapp.urls")),
        ])
    )
]
```

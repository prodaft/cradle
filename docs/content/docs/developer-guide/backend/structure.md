+++
title = "Project Structure"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Structure"
draft = false
weight = 1
+++

CRADLE’s backend is built using Django Rest Framework and follows a modular structure. This document provides an overview of the project structure and guidelines for contributions.

## 1. App Structure

CRADLE splits features into Django apps:

### a. Core Applications
- **user:** Handles user management.
- **entries:** Manages entries.
- **notes:** Manages note-taking.

### b. Additional Applications
- **notifications:** Manages notifications.
- **lsp:** Manages the LSP retrieval for editor
- **publish:** Manages report creation and importing
- **logs:** Implements logging functionality.
- **dashboards:** Constructs dashboards.
- **fleeting_notes:** Handles temporary (fleeting) notes.
- **query:** Implements query logic.
- **knowledge_graph:** Retrieves the knowledge graph.

### c. External Service Applications
- **file_transfer:** Manages file uploads/downloads.
- **mail:** Controls mailing templates and events

Core applications are essential for CRADLE’s functionality. Additional applications depend on the core and can be modified without affecting the system.

## 2. General Guidelines

### Adding a New Application
Follow the standard Django tutorial ([Django Tutorial](https://docs.djangoproject.com/en/5.0/intro/tutorial01/)) and then apply the testing modifications as described in the Testing section.

### Creating New Views
Use class-based views in `views.py` to keep your code maintainable. For example:

```python
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

class HelloWorldList(APIView):
    def get(self, request: Request) -> Response:
        return Response("Hello, world!", status=status.HTTP_200_OK)
```

### Including URL Configurations

Map your view in the app’s `urls.py`:

```python
from django.urls import path
from .views import HelloWorldList

urlpatterns = [
    path("", HelloWorldList.as_view(), name="helloworld_list")
]
```

Then include it in the main URL configuration:

```python
from django.urls import include, path
import os

BASE_URL = (os.environ.get("BASE_URL", "").strip("/") + "/").removeprefix("/")
urlpatterns = [
    path(
        BASE_URL,
        include([
            path("users/", include("user.urls")),
            path("entries/", include("entries.urls")),
            path("notes/", include("notes.urls")),
            path("dashboards/", include("dashboards.urls")),
            path("access/", include("access.urls")),
            path("query/", include("query.urls")),
            path("file-transfer/", include("file_transfer.urls")),
            path("fleeting-notes/", include("fleeting_notes.urls")),
            path("notifications/", include("notifications.urls")),
            path("knowledge-graph/", include("knowledge_graph.urls")),
            path("statistics/", include("cradle_statistics.urls")),
            path("hello-world/", include("newapp.urls")),
        ])
    )
]
```

+++
title = "Logging and Observability"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 12
+++

CRADLE uses an event-based logging system that captures key actions across the
backend. It uses Django content types to record structured log entries and
propagates them to related objects.

## Architecture overview

### EventLog model

Each log entry includes the `CradleUser` who performed the action, the event
type (`create`, `delete`, `edit`, `fetch`, `login`), the content object the
event relates to, optional JSON details, a timestamp, and an optional reference
to an originating log.

### Custom manager and logging API

`EventLogManager` provides a `log_event()` helper that determines the content
type and creates a log entry with a timestamp.

```python
EventLog.objects.log_event(
    user=request.user,
    event_type=EventType.CREATE,
    content_object=some_instance,
    details={"info": "Additional context"}
)
```

### LoggableModelMixin

Models can use `LoggableModelMixin` to log create, delete, edit, and fetch
events. The mixin also propagates logs to related objects.

### Utility functions

`logs/utils.py` formats log entries and provides helpers such as
`log_login_success()`, `log_entry_creation()`, and `log_failed_responses()`.

### API, filtering, and admin integration

`EventLogListView` exposes logs via REST with filtering for event type, user,
timestamp range, content type, and object ID. Logs are read-only in Django
admin.

## Usage examples

### Logging an event programmatically

```python
from logs.models import EventLog, EventType

def create_object(request):
    instance = MyModel.objects.create(...)
    instance.log_create(request.user)
```

### Propagating log entries

```python
instance.log_edit(request.user, details={"changed_field": "value"})
```

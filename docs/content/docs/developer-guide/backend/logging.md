+++
title = "Logging System"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Logging"
draft = false
weight = 2
+++

CRADLE uses an event‐based logging system that captures key actions across the backend. This new system leverages Django’s content type framework to record structured log entries and propagate them to related objects. Below is an overview of its architecture and usage.

## Architecture Overview

### EventLog Model

At the heart of our logging system is the **EventLog** model. Each log entry includes:
- **User:** The `CradleUser` who performed the action.
- **Event Type:** A type defined by the `EventType` enumeration (e.g., `create`, `delete`, `edit`, `fetch`, `login`).
- **Content Object:** The object (via a generic foreign key) that the event is related to.
- **Details:** An optional JSON field for extra context.
- **Timestamp:** The exact time when the event occurred.
- **Source Log:** An optional reference to an originating log (useful for propagating logs).

### Custom Manager and Logging API

The `EventLogManager` simplifies logging by offering a `log_event()` method. This method automatically:
- Determines the correct content type for the object.
- Creates a new log entry with a timestamp.

For example, you can log an event with:

```python
EventLog.objects.log_event(
    user=request.user,
    event_type=EventType.CREATE,
    content_object=some_instance,
    details={"info": "Additional context"}
)
```

### LoggableModelMixin

For models that should automatically log changes, the **LoggableModelMixin** provides methods such as:
- `log_create(user)`
- `log_delete(user, details)`
- `log_edit(user, details)`
- `log_fetch(user, details)`

This mixin not only logs the event for the current model instance but also propagates the log to related objects, ensuring that dependent changes are tracked.

### Utility Functions

In `logs/utils.py`, helper functions format log entries in an Nginx-style, which includes:
- Remote address
- Timestamp
- Request line and HTTP method
- User agent
- Custom messages

Functions such as `log_login_success()`, `log_entry_creation()`, and `log_failed_responses()` standardize logging across various actions.

### API, Filtering, and Admin Integration

- **API Access:**
  The `EventLogListView` endpoint exposes logs via a secure REST API. It supports filtering by event type, user, timestamp range, content type, and object ID. This makes it easy to integrate log monitoring into admin dashboards.

- **Filtering:**
  With DjangoFilterBackend and the custom `EventLogFilter`, you can filter logs in a case-insensitive manner, ensuring that you retrieve the exact data you need.

- **Admin Interface:**
  The logs are registered in Django’s admin with a custom `EventLogAdmin` configuration. They are read-only and include fields like timestamp, event type, user, and a reference to the source log. This prevents accidental modification while still providing full visibility into system events.

## Usage Examples

### Logging an Event Programmatically

To log an event when a user creates a new object:

```python
from logs.models import EventLog, EventType

def create_object(request):
    instance = MyModel.objects.create( ... )
    # Log the creation event
    instance.log_create(request.user)
```

### Propagating Log Entries

If an object is related to other loggable objects, use the mixin to propagate the event:

```python
# After updating a model, propagate the log to linked models:
instance.log_edit(request.user, details={"changed_field": "value"})
```

## Summary

This event-based logging system offers:
- **Structured and searchable logs** via the EventLog model.
- **Ease of integration** through helper methods and mixins.
- **Robust API access** for monitoring and administration.
- **Consistent formatting** to facilitate automated monitoring and human review.

By leveraging this system, backend developers can maintain a comprehensive audit trail and efficiently monitor system activity in CRADLE.

Happy coding and remember: robust logging is the first step to proactive maintenance and troubleshooting!

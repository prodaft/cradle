"""Core app constants (OpenAPI shapes, shared static config)."""

# RFC 9457-style error body schema for DRF Spectacular.
ERROR_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "description": "URI reference identifying the problem type",
            "example": "/errors/validation-error",
        },
        "title": {
            "type": "string",
            "description": "Short, human-readable summary of the problem type",
            "example": "Validation Error",
        },
        "status": {
            "type": "integer",
            "description": "HTTP status code",
            "example": 400,
        },
        "detail": {
            "type": "string",
            "description": "Human-readable explanation specific to this occurrence",
            "example": "Some values could not be accepted.",
        },
        "instance": {
            "type": "string",
            "description": "URI reference identifying the specific occurrence",
            "example": "/api/users/create",
        },
        "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 timestamp when the error occurred",
            "example": "2026-11-08T14:32:10.123456Z",
        },
        "code": {
            "type": "string",
            "description": "Machine-readable error code",
            "example": "VALIDATION_ERROR",
        },
        "errors": {
            "type": "object",
            "description": "Validation messages by user-facing label (same keys as in API responses after key transformation)",
            "additionalProperties": {"type": "array", "items": {"type": "string"}},
            "example": {
                "Page number": ["This may not be less than 1."],
                "Email": ["Enter a valid email address."],
            },
        },
    },
    "required": ["type", "title", "status", "detail", "timestamp", "code"],
}

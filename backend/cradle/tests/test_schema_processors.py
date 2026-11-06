from cradle.schema_processors import hoist_named_enums


def test_hoist_named_enums_replaces_inline_enums_and_parameters():
    """Inline enums matching a named set become refs; extra keys stay alongside."""
    named = {
        "ReportStatusEnum": ["working", "done", "error"],
        "NoteStatusEnum": ["healthy", "processing", "warning", "invalid"],
    }
    result = {
        "paths": {
            "/reports/": {
                "get": {
                    "parameters": [
                        {
                            "name": "status",
                            "schema": {
                                "type": "string",
                                "enum": ["error", "done", "working"],
                                "description": "Filter reports by status",
                            },
                        }
                    ]
                }
            }
        },
        "components": {
            "schemas": {
                "Note": {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "enum": ["healthy", "invalid", "processing", "warning"],
                        }
                    },
                }
            }
        },
    }

    hoist_named_enums(result, named)

    assert result["components"]["schemas"]["ReportStatusEnum"]["enum"] == [
        "working",
        "done",
        "error",
    ]
    assert result["paths"]["/reports/"]["get"]["parameters"][0]["schema"] == {
        "allOf": [{"$ref": "#/components/schemas/ReportStatusEnum"}],
        "description": "Filter reports by status",
    }
    assert result["components"]["schemas"]["Note"]["properties"]["status"] == {
        "$ref": "#/components/schemas/NoteStatusEnum"
    }


def test_hoist_named_enums_renames_existing_component():
    """Auto-named enum components are renamed and their refs updated."""
    named = {"DigestStatusEnum": ["working", "warning", "done", "error"]}
    result = {
        "components": {
            "schemas": {
                "Status613Enum": {
                    "type": "string",
                    "enum": ["done", "error", "warning", "working"],
                },
                "Digest": {
                    "type": "object",
                    "properties": {
                        "status": {"$ref": "#/components/schemas/Status613Enum"},
                    },
                },
            }
        }
    }

    hoist_named_enums(result, named)

    assert "Status613Enum" not in result["components"]["schemas"]
    assert result["components"]["schemas"]["DigestStatusEnum"]["enum"] == [
        "working",
        "warning",
        "done",
        "error",
    ]
    assert result["components"]["schemas"]["Digest"]["properties"]["status"] == {
        "$ref": "#/components/schemas/DigestStatusEnum"
    }


def test_name_error_responses_replaces_inline_error_bodies_with_component():
    """Inline error bodies become refs to ErrorResponse; other bodies are untouched."""
    from cradle.schema_processors import name_error_responses

    error_schema = {
        "type": "object",
        "properties": {"code": {"type": "string", "description": "Machine-readable error code"}},
        "required": ["code"],
    }
    other = {"$ref": "#/components/schemas/Note"}
    result = {
        "paths": {
            "/notes/": {
                "get": {
                    "responses": {
                        "200": {"content": {"application/json": {"schema": other}}},
                        "404": {"content": {"application/json": {"schema": dict(error_schema)}}},
                    }
                }
            }
        },
        "components": {"schemas": {}},
    }

    name_error_responses(result, error_schema, ["NOT_FOUND", "UNKNOWN_ERROR"])

    responses = result["paths"]["/notes/"]["get"]["responses"]
    assert responses["404"]["content"]["application/json"]["schema"] == {"$ref": "#/components/schemas/ErrorResponse"}
    assert responses["200"]["content"]["application/json"]["schema"] == other
    schemas = result["components"]["schemas"]
    assert schemas["ErrorCodeEnum"]["enum"] == ["NOT_FOUND", "UNKNOWN_ERROR"]
    assert schemas["ErrorResponse"]["properties"]["code"] == {"$ref": "#/components/schemas/ErrorCodeEnum"}
    assert error_schema["properties"]["code"]["type"] == "string"


def test_all_error_codes_covers_every_error_code_enum():
    """Every ErrorCode member across apps, plus the unknown fallback, is listed exactly once."""
    from core.exceptions import CoreErrorCodes
    from cradle.schema_processors import UNKNOWN_ERROR_CODE, all_error_codes
    from user.exceptions import UserErrorCodes

    codes = all_error_codes()

    assert len(codes) == len(set(codes))
    assert UNKNOWN_ERROR_CODE in codes
    assert {member.name for member in CoreErrorCodes} <= set(codes)
    assert {member.name for member in UserErrorCodes} <= set(codes)

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

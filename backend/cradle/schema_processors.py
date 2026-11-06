"""Custom schema processors for DRF Spectacular OpenAPI generation."""

import copy

ERROR_RESPONSE_COMPONENT = "ErrorResponse"
ERROR_CODE_COMPONENT = "ErrorCodeEnum"

UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR"

PATH_PARAMETER_DESCRIPTIONS = {
    "class_name": "Mapping class name, as listed by the mapping subclasses endpoint.",
    "class_subtype": "Entry class subtype.",
    "digest_id": "Digest ID.",
    "enricher_type": "Enricher class name.",
    "enrichment_id": "Enrichment request ID.",
    "entity_id": "Entity ID.",
    "entry_id": "Entry ID.",
    "file_id": "File ID.",
    "mapping_id": "Mapping ID.",
    "note_id": "Note ID.",
    "notification_id": "Notification ID.",
    "provider": "OAuth provider name, as configured on the server.",
    "relation_id": "Relation ID.",
    "report_id": "Report ID.",
    "session_id": "Session ID.",
    "snippet_id": "Snippet ID.",
    "team_id": "Team ID.",
    "upload_id": "Upload ID.",
    "user_id": "User ID.",
}


def _update_schema_refs(obj, mapping):
    """Recursively update $ref values according to mapping (old_name -> new_name)."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "$ref" and isinstance(value, str):
                for old_name, new_name in mapping.items():
                    if value.endswith(f"/{old_name}"):
                        obj[key] = value.replace(f"/{old_name}", f"/{new_name}")
                        break
            else:
                _update_schema_refs(value, mapping)
    elif isinstance(obj, list):
        for item in obj:
            _update_schema_refs(item, mapping)


def schema_enum_values() -> dict[str, list[str]]:
    """Stable OpenAPI names for choice sets the UI imports as const arrays."""
    from access.enums import AccessType
    from core.utils import FORM_FIELD_TYPES
    from entries.enums import EntryType, EntryTypeFormat, RelationReason
    from intelio.enums import DigestStatus, EnrichmentStatus
    from logs.enums import EventType
    from notes.enums import NoteListStatus, NoteStatus
    from publish.models import DownloadStrategies, ReportStatus
    from teams.enums import TeamRole
    from user.models import UserRoles

    return {
        "AccessTypeEnum": list(AccessType.values),
        "DigestStatusEnum": list(DigestStatus.values),
        "DownloadStrategyEnum": list(DownloadStrategies.values),
        "EnrichmentStatusEnum": list(EnrichmentStatus.values),
        "EntryTypeEnum": list(EntryType.values),
        "EntryTypeFormatEnum": list(EntryTypeFormat.values),
        "EventTypeEnum": list(EventType.values),
        "MappingFieldTypeEnum": list(FORM_FIELD_TYPES),
        "NoteListStatusEnum": list(NoteListStatus.values),
        "NoteStatusEnum": list(NoteStatus.values),
        "RelationReasonEnum": list(RelationReason.values),
        "ReportStatusEnum": list(ReportStatus.values),
        "TeamRoleEnum": list(TeamRole.values),
        "UserRoleEnum": list(UserRoles.values),
    }


def _enum_values(schema: object) -> frozenset[str] | None:
    """String enum members, ignoring blank and null sentinels."""
    if not isinstance(schema, dict) or "enum" not in schema:
        return None
    if schema.get("type") not in ("string", None):
        return None
    values = schema.get("enum")
    if not isinstance(values, list):
        return None
    cleaned = [value for value in values if value not in ("", None)]
    if not cleaned or not all(isinstance(value, str) for value in cleaned):
        return None
    return frozenset(cleaned)


def hoist_named_enums(result: dict, named: dict[str, list[str]]) -> dict:
    """Turn inline string enums into named components the client can import."""
    components = result.setdefault("components", {})
    schemas = components.setdefault("schemas", {})
    by_values = {frozenset(values): name for name, values in named.items()}
    if len(by_values) != len(named):
        raise ValueError("Named schema enums must have distinct value sets")

    renames: dict[str, str] = {}
    for component_name, schema in list(schemas.items()):
        identity = _enum_values(schema)
        target = by_values.get(identity) if identity else None
        if target and component_name != target:
            renames[component_name] = target
            schemas.pop(component_name)

    for name, values in named.items():
        schema = schemas.get(name)
        if not isinstance(schema, dict):
            schema = {}
            schemas[name] = schema
        schema["type"] = "string"
        schema["enum"] = list(values)

    if renames:
        _update_schema_refs(result, renames)

    def replace(node: object) -> None:
        if isinstance(node, dict):
            for key, value in list(node.items()):
                identity = _enum_values(value)
                target = by_values.get(identity) if identity else None
                if target and key != target:
                    rest = {
                        item_key: item_value
                        for item_key, item_value in value.items()
                        if item_key not in ("type", "enum", "x-spec-enum-id")
                    }
                    ref = {"$ref": f"#/components/schemas/{target}"}
                    node[key] = {"allOf": [ref], **rest} if rest else ref
                else:
                    replace(value)
        elif isinstance(node, list):
            for item in node:
                replace(item)

    replace(result)
    return result


def postprocess_schema_enums(result, generator, request, public):
    """Expose choice sets as stable schema components (AccessTypeEnum, ...)."""
    return hoist_named_enums(result, schema_enum_values())


def postprocess_schema_operation_ids(result, generator, request, public):
    """Remove auto-generated 'api' prefix from operationIds for cleaner client codegen."""
    paths = result.get("paths", {})

    for path_item in paths.values():
        if not isinstance(path_item, dict):
            continue
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if not operation_id or not isinstance(operation_id, str):
                continue
            if operation_id.startswith("api_"):
                operation["operationId"] = operation_id[4:]
                continue
            if operation_id.startswith("api") and len(operation_id) > 3:
                next_char = operation_id[3]
                if next_char.isupper():
                    operation["operationId"] = next_char.lower() + operation_id[4:]

    return result


def postprocess_schema_pagination_refs(result, generator, request, public):
    """Fix ListAPIView double-wrapping so paginated endpoints reference the correct response schema."""
    pagination_ref_fixes = {
        "PaginatedReportListPaginatedResponseList": "ReportListPaginatedResponse",
        "PaginatedEntryQueryPaginatedResponseList": "EntryQueryPaginatedResponse",
        "PaginatedAdvancedQueryPaginatedResponseList": "AdvancedQueryPaginatedResponse",
        "PaginatedPaginatedEventLogSerializerResponseList": "PaginatedEventLogSerializerResponse",
        "PaginatedPaginatedAccessUserSerializerResponseList": "PaginatedAccessUserSerializerResponse",
        "PaginatedPaginatedAccessEntitySerializerResponseList": "PaginatedAccessEntitySerializerResponse",
        "PaginatedPaginatedUserRetrieveSerializerResponseList": "PaginatedUserRetrieveSerializerResponse",
        "PaginatedPaginatedEntryResponseSerializerResponseList": "PaginatedEntryResponseSerializerResponse",
        "PaginatedPaginatedEntryClassSerializerCountResponseList": "PaginatedEntryClassSerializerCountResponse",
        "PaginatedPaginatedTeamSerializerResponseList": "PaginatedTeamSerializerResponse",
        "PaginatedPaginatedTeamMemberSerializerResponseList": "PaginatedTeamMemberSerializerResponse",
        "PaginatedPaginatedTeamAccessSerializerResponseList": "PaginatedTeamAccessSerializerResponse",
        "PaginatedPaginatedTeamCandidateSerializerResponseList": "PaginatedTeamCandidateSerializerResponse",
        "PaginatedPaginatedNoteShareCandidateSerializerResponseList": "PaginatedNoteShareCandidateSerializerResponse",
    }
    _update_schema_refs(result, pagination_ref_fixes)
    return result


def postprocess_schema_path_parameters(result, generator, request, public):
    """Drop path parameters that the operation's URL does not contain.

    The /users/me/... views subclass the /users/<user_id>/... ones and inherit their ``user_id`` parameter,
    though the "me" routes have no such segment.
    """
    for path, operations in result.get("paths", {}).items():
        for operation in operations.values():
            if not isinstance(operation, dict) or "parameters" not in operation:
                continue
            operation["parameters"] = [
                param
                for param in operation["parameters"]
                if param.get("in") != "path" or "{" + param.get("name", "") + "}" in path
            ]
            for param in operation["parameters"]:
                if param.get("in") == "path" and not param.get("description"):
                    description = PATH_PARAMETER_DESCRIPTIONS.get(param.get("name", ""))
                    if description:
                        param["description"] = description
    return result


def all_error_codes() -> list[str]:
    """Every ``code`` an API error body can carry: all ErrorCode members plus the unknown fallback."""
    from django.utils.module_loading import autodiscover_modules

    from core.exceptions import ErrorCode

    autodiscover_modules("exceptions")

    codes: list[str] = []
    pending = list(ErrorCode.__subclasses__())
    while pending:
        enum_class = pending.pop()
        pending.extend(enum_class.__subclasses__())
        codes.extend(member.name for member in enum_class)

    duplicates = sorted({code for code in codes if codes.count(code) > 1})
    if duplicates:
        raise ValueError(f"Error codes must be unique across apps: {duplicates}")
    return sorted([*codes, UNKNOWN_ERROR_CODE])


def name_error_responses(result: dict, error_schema: dict, codes: list[str]) -> dict:
    """Replace inline error bodies with a shared ErrorResponse component whose code is an enum."""
    schemas = result.setdefault("components", {}).setdefault("schemas", {})
    ref = {"$ref": f"#/components/schemas/{ERROR_RESPONSE_COMPONENT}"}

    component = copy.deepcopy(error_schema)
    code_schema = component["properties"]["code"]
    schemas[ERROR_CODE_COMPONENT] = {
        "type": "string",
        "enum": list(codes),
        "description": code_schema.get("description", ""),
    }
    component["properties"]["code"] = {"$ref": f"#/components/schemas/{ERROR_CODE_COMPONENT}"}
    schemas[ERROR_RESPONSE_COMPONENT] = component

    for operations in result.get("paths", {}).values():
        for operation in operations.values():
            if not isinstance(operation, dict):
                continue
            for response in operation.get("responses", {}).values():
                for media in (response.get("content") or {}).values():
                    if media.get("schema") == error_schema:
                        media["schema"] = dict(ref)
    return result


def postprocess_schema_error_responses(result, generator, request, public):
    """Expose the RFC 9457 error body as ErrorResponse with a typed ErrorCodeEnum ``code``."""
    from core.constants import ERROR_RESPONSE_SCHEMA

    return name_error_responses(result, ERROR_RESPONSE_SCHEMA, all_error_codes())

"""Custom schema processors for DRF Spectacular OpenAPI generation."""


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


def postprocess_schema_enums(result, generator, request, public):
    """Rename auto-generated enum names (e.g. Status613Enum) to meaningful ones (DigestStatusEnum)."""
    if "components" not in result or "schemas" not in result["components"]:
        return result

    # Define the mapping of auto-generated names to meaningful names
    enum_name_mapping = {
        "Status613Enum": "DigestStatusEnum",
        "Status0b4Enum": "NoteStatusEnum",
        "Type54aEnum": "EntryTypeEnum",
    }

    schemas = result["components"]["schemas"]

    # Create new schemas with renamed enums
    for old_name, new_name in enum_name_mapping.items():
        if old_name in schemas:
            schemas[new_name] = schemas.pop(old_name)

    _update_schema_refs(result, enum_name_mapping)
    return result


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
    }
    _update_schema_refs(result, pagination_ref_fixes)
    return result


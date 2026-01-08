"""
Custom schema processors for DRF Spectacular
"""


def postprocess_schema_enums(result, generator, request, public):
    """
    Post-process schema to rename auto-generated enum names to more meaningful ones
    """
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

    # Update all references to the old enum names
    def update_refs(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "$ref" and isinstance(value, str):
                    for old_name, new_name in enum_name_mapping.items():
                        if value.endswith(f"/{old_name}"):
                            obj[key] = value.replace(f"/{old_name}", f"/{new_name}")
                else:
                    update_refs(value)
        elif isinstance(obj, list):
            for item in obj:
                update_refs(item)

    update_refs(result)
    return result


def postprocess_schema_operation_ids(result, generator, request, public):
    """
    Post-process schema to remove auto "api" prefixes from operationIds.
    """
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


def postprocess_schema_path_prefix(result, generator, request, public):
    """
    Post-process schema to remove the leading /api path prefix.
    """
    paths = result.get("paths", {})
    if not paths:
        return result

    rewritten = {}
    for path, path_item in paths.items():
        if not isinstance(path, str):
            rewritten[path] = path_item
            continue
        if path.startswith("/api/"):
            rewritten_path = "/" + path[5:]
        elif path == "/api":
            rewritten_path = "/"
        else:
            rewritten_path = path
        rewritten[rewritten_path] = path_item

    result["paths"] = rewritten
    return result

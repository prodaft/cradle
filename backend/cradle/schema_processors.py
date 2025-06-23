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

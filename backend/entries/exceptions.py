"""Exceptions and error codes for the entries app."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class EntriesErrorCodes(ErrorCode):
    """Error codes for entry operations."""

    ENTRY_TYPE_MISMATCH = (
        status.HTTP_409_CONFLICT,
        "Entry Type Mismatch",
        "entry-type-mismatch",
    )
    INVALID_ALIAS_TARGET = (
        status.HTTP_409_CONFLICT,
        "Invalid Alias Target",
        "invalid-alias-target",
    )
    ENTRY_TYPE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entry Type Not Found",
        "entry-type-not-found",
    )
    DUPLICATE_ENTRY = (status.HTTP_409_CONFLICT, "Duplicate Entry", "duplicate-entry")
    DUPLICATE_ENTITY = (
        status.HTTP_409_CONFLICT,
        "Duplicate Entity",
        "duplicate-entity",
    )
    INVALID_PATTERN = (
        status.HTTP_409_CONFLICT,
        "Invalid Pattern",
        "invalid-pattern",
    )
    INVALID_ENTRY = (status.HTTP_409_CONFLICT, "Invalid Entry", "invalid-entry")
    NOTE_REFERENCE_NOT_ALLOWED = (
        status.HTTP_409_CONFLICT,
        "Note Reference Not Allowed",
        "note-reference-not-allowed",
    )
    INVALID_ENTRY_TYPE_SETTINGS = (
        status.HTTP_409_CONFLICT,
        "Invalid Entry Type Settings",
        "invalid-entry-type-settings",
    )
    ENTRY_TYPE_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Entry Type Required",
        "entry-type-required",
    )
    INVALID_ENTRY_HIERARCHY = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Entry Hierarchy",
        "invalid-entry-hierarchy",
    )
    ENTITY_LIMIT_EXCEEDED = (
        status.HTTP_400_BAD_REQUEST,
        "Entity Limit Exceeded",
        "entity-limit-exceeded",
    )
    ENTRY_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Entry Not Found", "entry-not-found")
    ENTITY_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entity Not Found",
        "entity-not-found",
    )
    INVALID_ENTRY_TYPE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Entry Type",
        "invalid-entry-type",
    )
    ADMIN_ONLY_ENTITY_CREATE = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only Entity Create",
        "admin-only-entity-create",
    )
    ADMIN_ONLY_ENTITY_DELETE = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only Entity Delete",
        "admin-only-entity-delete",
    )
    ADMIN_ONLY_ENTITY_PUBLIC_STATUS = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only Entity Public Status",
        "admin-only-entity-public-status",
    )
    ADMIN_ONLY_ENTRY_TYPE_DELETE = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only Entry Type Delete",
        "admin-only-entry-type-delete",
    )
    ADMIN_ONLY_ENTRY_TYPE_CHANGE = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only Entry Type Change",
        "admin-only-entry-type-change",
    )
    CANNOT_DELETE_ALIAS_ENTRY_TYPE = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Delete Alias Entry Type",
        "cannot-delete-alias-entry-type",
    )
    CANNOT_EDIT_ALIAS_ENTRY_TYPE = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Edit Alias Entry Type",
        "cannot-edit-alias-entry-type",
    )
    ADMIN_ONLY_VIEW_COUNT = (
        status.HTTP_403_FORBIDDEN,
        "Admin Only View Count",
        "admin-only-view-count",
    )
    INVALID_RELATED_ENTRIES = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Related Entries",
        "invalid-related-entries",
    )
    RELATED_ENTRIES_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Related Entries Required",
        "related-entries-required",
    )
    RELATION_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Relation Not Found",
        "relation-not-found",
    )


class EntryTypeMismatchException(CradleAPIException):
    """Exception raised when entry subtype has different type than expected."""

    error_code = EntriesErrorCodes.ENTRY_TYPE_MISMATCH

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "The entry type does not match the selection."
        super().__init__(detail=detail, error_code=error_code, code=code)


class InvalidAliasTargetException(CradleAPIException):
    """Exception raised when trying to alias from entity to another entity."""

    error_code = EntriesErrorCodes.INVALID_ALIAS_TARGET

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "Only artifact entries can be used as aliases."
        super().__init__(detail=detail, error_code=error_code, code=code)


class EntryTypeNotFoundException(CradleAPIException):
    """Exception raised when entry type is not found."""

    error_code = EntriesErrorCodes.ENTRY_TYPE_NOT_FOUND

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "That entry type could not be found."
        super().__init__(detail=detail, error_code=error_code, code=code)


class DuplicateEntryException(CradleAPIException):
    """Exception raised when entry with same name already exists."""

    error_code = EntriesErrorCodes.DUPLICATE_ENTRY


class DuplicateEntityException(CradleAPIException):
    """Exception raised when entity with same name already exists."""

    error_code = EntriesErrorCodes.DUPLICATE_ENTITY


class InvalidPatternException(CradleAPIException):
    """Exception raised when regex is invalid."""

    error_code = EntriesErrorCodes.INVALID_PATTERN


class InvalidEntryException(CradleAPIException):
    """Exception raised when entry does not match the specified format."""

    error_code = EntriesErrorCodes.INVALID_ENTRY

    def __init__(self, entry_class: str, _data: str, *args, **kwargs) -> None:
        s = str(entry_class)
        label = s.replace("_", " ").strip() or s
        detail = f'The value does not match the format required for the entry type "{label}".'
        super().__init__(detail=detail, *args, **kwargs)


class NoteReferenceNotAllowedException(CradleAPIException):
    """Exception raised when trying to link to an alias directly."""

    error_code = EntriesErrorCodes.NOTE_REFERENCE_NOT_ALLOWED

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "That entry type cannot be referenced from a note."
        super().__init__(detail=detail, error_code=error_code, code=code)


class InvalidEntryTypeSettingsException(CradleAPIException):
    """Exception raised when entry class has invalid format specification."""

    error_code = EntriesErrorCodes.INVALID_ENTRY_TYPE_SETTINGS


class EntryTypeRequiredException(CradleAPIException):
    """Exception raised when entry is missing subtype."""

    error_code = EntriesErrorCodes.ENTRY_TYPE_REQUIRED

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "An entry type is required."
        super().__init__(detail=detail, error_code=error_code, code=code)


class InvalidEntryHierarchyException(CradleAPIException):
    """Exception raised when class conflicts with existing hierarchy."""

    error_code = EntriesErrorCodes.INVALID_ENTRY_HIERARCHY

    def __init__(self, entry_class: str, *args, **kwargs) -> None:
        s = str(entry_class)
        label = s.replace("_", " ").strip() or s
        detail = f'The entry type "{label}" cannot be placed here because it conflicts with the existing hierarchy.'
        super().__init__(detail=detail, *args, **kwargs)


class EntityLimitExceededException(CradleAPIException):
    """Exception raised when user has run out of entity slots."""

    error_code = EntriesErrorCodes.ENTITY_LIMIT_EXCEEDED

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "The maximum number of entities has been reached."
        super().__init__(detail=detail, error_code=error_code, code=code)


class EntryNotFoundException(CradleAPIException):
    """Exception raised when entry is not found."""

    error_code = EntriesErrorCodes.ENTRY_NOT_FOUND


class EntityNotFoundException(CradleAPIException):
    """Exception raised when entity is not found."""

    error_code = EntriesErrorCodes.ENTITY_NOT_FOUND


class InvalidEntryTypeException(CradleAPIException):
    """Exception raised when entry type is invalid."""

    error_code = EntriesErrorCodes.INVALID_ENTRY_TYPE


class AdminOnlyEntityCreateException(CradleAPIException):
    """Exception raised when non-admin tries to create entity."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_CREATE


class AdminOnlyEntityDeleteException(CradleAPIException):
    """Exception raised when non-admin tries to delete an entity."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_DELETE


class AdminOnlyEntityPublicStatusException(CradleAPIException):
    """Exception raised when non-admin tries to change entity public status."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_PUBLIC_STATUS


class AdminOnlyEntryTypeDeleteException(CradleAPIException):
    """Exception raised when non-admin tries to delete entry class."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTRY_TYPE_DELETE


class AdminOnlyEntryTypeChangeException(CradleAPIException):
    """Exception raised when non-admin tries to change entry class type."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTRY_TYPE_CHANGE


class CannotDeleteAliasEntryTypeException(CradleAPIException):
    """Exception raised when trying to delete alias entry class."""

    error_code = EntriesErrorCodes.CANNOT_DELETE_ALIAS_ENTRY_TYPE


class CannotEditAliasEntryTypeException(CradleAPIException):
    """Exception raised when trying to edit alias entry class."""

    error_code = EntriesErrorCodes.CANNOT_EDIT_ALIAS_ENTRY_TYPE


class AdminOnlyViewCountException(CradleAPIException):
    """Exception raised when non-admin tries to view entry class count."""

    error_code = EntriesErrorCodes.ADMIN_ONLY_VIEW_COUNT


class InvalidRelatedEntriesException(CradleAPIException):
    """Exception raised when relates parameter has invalid values."""

    error_code = EntriesErrorCodes.INVALID_RELATED_ENTRIES

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "One or more related entries are invalid or could not be read."
        super().__init__(detail=detail, error_code=error_code, code=code)


class RelatedEntriesRequiredException(CradleAPIException):
    """Exception raised when relates parameter is missing."""

    error_code = EntriesErrorCodes.RELATED_ENTRIES_REQUIRED

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "Select at least one related entry."
        super().__init__(detail=detail, error_code=error_code, code=code)


class RelationNotFoundException(CradleAPIException):
    """Exception raised when a relation is not found."""

    error_code = EntriesErrorCodes.RELATION_NOT_FOUND

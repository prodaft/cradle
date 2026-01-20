from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class EntriesErrorCodes(ErrorCode):
    """Error codes for entry operations"""

    ENTRY_TYPE_MISMATCH = (
        status.HTTP_409_CONFLICT,
        "Entry Type Mismatch",
        "entry-type-mismatch",
    )
    CANNOT_ALIAS_TO_ENTITY = (
        status.HTTP_409_CONFLICT,
        "Cannot Alias to Entity",
        "cannot-alias-to-entity",
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
    DUPLICATE_ARTIFACT = (
        status.HTTP_409_CONFLICT,
        "Duplicate Artifact",
        "duplicate-artifact",
    )
    INVALID_REGEX = (status.HTTP_409_CONFLICT, "Invalid Regex", "invalid-regex")
    INVALID_ENTRY = (status.HTTP_409_CONFLICT, "Invalid Entry", "invalid-entry")
    ALIAS_CANNOT_BE_LINKED = (
        status.HTTP_409_CONFLICT,
        "Alias Cannot Be Linked",
        "alias-cannot-be-linked",
    )
    INVALID_CLASS_FORMAT = (
        status.HTTP_409_CONFLICT,
        "Invalid Class Format",
        "invalid-class-format",
    )
    ENTRY_MUST_HAVE_SUBTYPE = (
        status.HTTP_400_BAD_REQUEST,
        "Entry Must Have Subtype",
        "entry-must-have-subtype",
    )
    CLASS_BREAKS_HIERARCHY = (
        status.HTTP_400_BAD_REQUEST,
        "Class Breaks Hierarchy",
        "class-breaks-hierarchy",
    )
    OUT_OF_ENTITY_SLOTS = (
        status.HTTP_400_BAD_REQUEST,
        "Out of Entity Slots",
        "out-of-entity-slots",
    )
    ENTRY_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Entry Not Found", "entry-not-found")
    ENTITY_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entity Not Found",
        "entity-not-found",
    )
    ENTRY_CLASS_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entry Class Not Found",
        "entry-class-not-found",
    )
    INVALID_ENTRY_TYPE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Entry Type",
        "invalid-entry-type",
    )
    ADMIN_ONLY_ENTITY_CREATE = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can Create Entities",
        "admin-only-entity-create",
    )
    ADMIN_ONLY_ENTITY_DELETE = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can Delete Entities",
        "admin-only-entity-delete",
    )
    ADMIN_ONLY_ENTITY_PUBLIC_STATUS = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can Change Entity Public Status",
        "admin-only-entity-public-status",
    )
    ADMIN_ONLY_ENTRY_CLASS_DELETE = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can Delete Entry Classes",
        "admin-only-entry-class-delete",
    )
    ADMIN_ONLY_ENTRY_CLASS_TYPE_CHANGE = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can Change Entry Class Type",
        "admin-only-entry-class-type-change",
    )
    CANNOT_DELETE_ALIAS_CLASS = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Delete Alias Entry Class",
        "cannot-delete-alias-class",
    )
    CANNOT_EDIT_ALIAS_CLASS = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Edit Alias Entry Class",
        "cannot-edit-alias-class",
    )
    ADMIN_ONLY_VIEW_COUNT = (
        status.HTTP_403_FORBIDDEN,
        "Only Admins Can View Entry Class Count",
        "admin-only-view-count",
    )
    INVALID_RELATES_PARAMETER = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Relates Parameter",
        "invalid-relates-parameter",
    )
    RELATES_PARAMETER_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Relates Parameter Required",
        "relates-parameter-required",
    )
    INVALID_PAGE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page Size",
        "invalid-page-size",
    )
    PAGE_SIZE_TOO_LARGE = (
        status.HTTP_400_BAD_REQUEST,
        "Page Size Too Large",
        "page-size-too-large",
    )


class EntryTypeMismatchException(CradleAPIException):
    """Exception raised when entry subtype has different type than expected"""

    error_code = EntriesErrorCodes.ENTRY_TYPE_MISMATCH


class CannotAliasToEntityException(CradleAPIException):
    """Exception raised when trying to alias from entity to another entity"""

    error_code = EntriesErrorCodes.CANNOT_ALIAS_TO_ENTITY


class EntryTypeDoesNotExist(CradleAPIException):
    """Exception raised when entry type is not found"""

    error_code = EntriesErrorCodes.ENTRY_TYPE_NOT_FOUND


class DuplicateEntryException(CradleAPIException):
    """Exception raised when entry with same name already exists"""

    error_code = EntriesErrorCodes.DUPLICATE_ENTRY


class DuplicateEntityException(CradleAPIException):
    """Exception raised when entity with same name already exists"""

    error_code = EntriesErrorCodes.DUPLICATE_ENTITY


class DuplicateArtifactException(CradleAPIException):
    """Exception raised when artifact with same name already exists"""

    error_code = EntriesErrorCodes.DUPLICATE_ARTIFACT


class InvalidRegexException(CradleAPIException):
    """Exception raised when regex is invalid"""

    error_code = EntriesErrorCodes.INVALID_REGEX


class InvalidEntryException(CradleAPIException):
    """Exception raised when entry does not obey specified format"""

    error_code = EntriesErrorCodes.INVALID_ENTRY

    def __init__(self, entry_class: str, data: str, *args, **kwargs) -> None:
        detail = f"Entry ({entry_class}: {data}) does not" + " obey the specified format for the entry type!"
        super().__init__(detail=detail, *args, **kwargs)


class AliasCannotBeLinked(CradleAPIException):
    """Exception raised when trying to link to an alias directly"""

    error_code = EntriesErrorCodes.ALIAS_CANNOT_BE_LINKED


class InvalidClassFormatException(CradleAPIException):
    """Exception raised when entry class has invalid format specification"""

    error_code = EntriesErrorCodes.INVALID_CLASS_FORMAT


class EntryMustHaveASubtype(CradleAPIException):
    """Exception raised when entry is missing subtype"""

    error_code = EntriesErrorCodes.ENTRY_MUST_HAVE_SUBTYPE


class ClassBreaksHierarchyException(CradleAPIException):
    """Exception raised when class conflicts with existing hierarchy"""

    error_code = EntriesErrorCodes.CLASS_BREAKS_HIERARCHY

    def __init__(self, entry_class: str, *args, **kwargs) -> None:
        detail = f"The class conflicts with existing class '{entry_class}'"
        super().__init__(detail=detail, *args, **kwargs)


class OutOfEntitySlotsException(CradleAPIException):
    """Exception raised when user has run out of entity slots"""

    error_code = EntriesErrorCodes.OUT_OF_ENTITY_SLOTS


class EntryNotFoundException(CradleAPIException):
    """Exception raised when entry is not found"""

    error_code = EntriesErrorCodes.ENTRY_NOT_FOUND


class EntityNotFoundException(CradleAPIException):
    """Exception raised when entity is not found"""

    error_code = EntriesErrorCodes.ENTITY_NOT_FOUND


class EntryClassNotFoundException(CradleAPIException):
    """Exception raised when entry class is not found"""

    error_code = EntriesErrorCodes.ENTRY_CLASS_NOT_FOUND


class InvalidEntryTypeException(CradleAPIException):
    """Exception raised when entry type is invalid"""

    error_code = EntriesErrorCodes.INVALID_ENTRY_TYPE


class AdminOnlyEntityCreateException(CradleAPIException):
    """Exception raised when non-admin tries to create entity"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_CREATE


class AdminOnlyEntityDeleteException(CradleAPIException):
    """Exception raised when non-admin tries to delete entity"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_DELETE


class AdminOnlyEntityPublicStatusException(CradleAPIException):
    """Exception raised when non-admin tries to change entity public status"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTITY_PUBLIC_STATUS


class AdminOnlyEntryClassDeleteException(CradleAPIException):
    """Exception raised when non-admin tries to delete entry class"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTRY_CLASS_DELETE


class AdminOnlyEntryClassTypeChangeException(CradleAPIException):
    """Exception raised when non-admin tries to change entry class type"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_ENTRY_CLASS_TYPE_CHANGE


class CannotDeleteAliasClassException(CradleAPIException):
    """Exception raised when trying to delete alias entry class"""

    error_code = EntriesErrorCodes.CANNOT_DELETE_ALIAS_CLASS


class CannotEditAliasClassException(CradleAPIException):
    """Exception raised when trying to edit alias entry class"""

    error_code = EntriesErrorCodes.CANNOT_EDIT_ALIAS_CLASS


class AdminOnlyViewCountException(CradleAPIException):
    """Exception raised when non-admin tries to view entry class count"""

    error_code = EntriesErrorCodes.ADMIN_ONLY_VIEW_COUNT


class InvalidRelatesParameterException(CradleAPIException):
    """Exception raised when relates parameter has invalid values"""

    error_code = EntriesErrorCodes.INVALID_RELATES_PARAMETER


class RelatesParameterRequiredException(CradleAPIException):
    """Exception raised when relates parameter is missing"""

    error_code = EntriesErrorCodes.RELATES_PARAMETER_REQUIRED


class InvalidPageSizeException(CradleAPIException):
    """Exception raised when page_size parameter is invalid"""

    error_code = EntriesErrorCodes.INVALID_PAGE_SIZE


class PageSizeTooLargeException(CradleAPIException):
    """Exception raised when page_size parameter is too large"""

    error_code = EntriesErrorCodes.PAGE_SIZE_TOO_LARGE

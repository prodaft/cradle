from typing import Dict, Set
from entities.models import Entity
from access.models import Access
from user.models import CradleUser
from ..exceptions import NoAccessToEntitiesException
from access.enums import AccessType


class AccessCheckerTask:

    def __init__(self, user: CradleUser):
        self.user = user

    def run(
        self, referenced_entities: Dict[str, Set[Entity]]
    ) -> Dict[str, Set[Entity]]:
        """Checks whether the user has read-write access to a list of cases
        that were referenced in the note. If the user does not have read-write
        access to all of them, they will receive an error message as if the
        case would not exist.

        Args:
            referenced_entities: Dictionary containing sets of the entities being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing sets of entities being referenced. In the
            case of this task, the old dictionary is returned.

        Raises:
            NoAccessToEntitiesException: The referenced agents or cases do not exist.
        """

        required_access = {AccessType.READ_WRITE}

        if not Access.objects.has_access_to_cases(
            self.user, referenced_entities["case"], required_access
        ):
            raise NoAccessToEntitiesException()
        return referenced_entities

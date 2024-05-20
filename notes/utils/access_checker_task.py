from typing import Dict, Set
from entities.models import Entity
from user.models.access_model import Access
from user.models.cradle_user_model import CradleUser
from django.http import Http404


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
            Http404: The referenced agents or cases do not exist.
        """

        referenced_case_ids = {case.id for case in referenced_entities["case"]}

        if not Access.objects.has_access_to_cases(self.user, referenced_case_ids):
            raise Http404("The referenced agents or cases do not exist.")
        return referenced_entities

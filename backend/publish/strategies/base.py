from typing import List, Optional
from notes.models import Note
from user.models import CradleUser


class PublishResult:
    def __init__(
        self, success: bool, data: Optional[str] = None, error: Optional[str] = None
    ):
        self.success = success
        self.data = data
        self.error = error

    def __bool__(self):
        return self.success


class BasePublishStrategy:
    """
    Base interface for a publishing strategy.
    """

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        """
        Generate an access link to an existing published resource.
        """
        raise NotImplementedError()

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Edit an existing published resource (given its location).
        """
        raise NotImplementedError()

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Create a brand new report/publication from scratch.
        """
        raise NotImplementedError()

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        """
        Delete an existing published resource (given its location).
        """
        raise NotImplementedError()

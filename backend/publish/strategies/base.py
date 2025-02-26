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
    def __init__(self) -> None:
        pass

    def publish(self, title: str, notes: List[Note], user: CradleUser) -> PublishResult:
        raise NotImplementedError()

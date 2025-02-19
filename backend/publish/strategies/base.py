from typing import List
from notes.models import Note
from user.models import CradleUser


class BasePublishStrategy:
    def __init__(self) -> None:
        pass

    def publish(self, title: str, notes: List[Note], user: CradleUser):
        raise NotImplementedError()

from abc import ABC, abstractmethod
from typing import Iterable, Optional, Tuple

from celery import Celery

from entries.models import Entry
from user.models import CradleUser
from ..models import Note


class BaseTask(ABC):
    def __init__(self, user: CradleUser) -> None:
        super().__init__()
        self.user = user

    @abstractmethod
    def run(
        self, note: Note, entries: Iterable[Entry]
    ) -> Tuple[Optional[Celery], Iterable[Entry]]:
        """
        The method that is executed within the chain of responsibility.
        An error being thrown, or None being returned means the whole
        note creation process is cancelled.
        """
        raise NotImplementedError()

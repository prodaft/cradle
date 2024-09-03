from abc import ABC, abstractmethod
from typing import Optional
from ..models import Note


class BaseTask(ABC):
    @abstractmethod
    def run(self, note: Note) -> Optional[Note]:
        """
        The method that is executed within the chain of responsibility.
        An error being thrown, or None being returned means the whole
        note creation process is cancelled.
        """
        raise NotImplementedError()

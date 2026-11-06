"""Base task interface for the note processing pipeline."""

from abc import ABC, abstractmethod
from typing import Iterable

from celery.canvas import Signature

from entries.models import Entry
from user.models import CradleUser

from ..models import Note


class BaseTask(ABC):
    """Abstract base for pipeline tasks. Each task runs on a note and may chain Celery tasks."""

    def __init__(self, user: CradleUser) -> None:
        self.user = user

    @property
    @abstractmethod
    def is_validator(self) -> bool:
        """True if this task should be skipped when validate=False."""
        ...

    @abstractmethod
    def run(self, note: Note, entries: Iterable[Entry]) -> tuple[Signature | None, Iterable[Entry]]:
        """Execute this step in the chain of responsibility.

        Implementations may raise to abort the pipeline.

        Args:
            note: The note being processed through the pipeline.
            entries: Entries accumulated from prior steps; implementations often pass
                these through unchanged.

        Returns:
            A Celery ``Signature`` to enqueue next work (or ``None`` if there is no
            async follow-up), and the ``entries`` iterable for downstream steps.
        """
        ...

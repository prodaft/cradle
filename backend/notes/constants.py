"""Notes app constants."""

from .processor.access_control_task import AccessControlTask
from .processor.base_task import BaseTask
from .processor.connect_aliases_task import AliasConnectionTask
from .processor.entry_class_creation_task import EntryClassCreationTask
from .processor.entry_population_task import EntryPopulationTask
from .processor.finalize_note_task import FinalizeNoteTask
from .processor.link_files_task import LinkFilesTask
from .processor.metadata_process_task import MetadataProcessTask
from .processor.smart_linker_task import SmartLinkerTask
from .processor.validate_note_task import ValidateNoteTask

# Default note processing pipeline (class list; TaskScheduler instantiates per user).
NOTES_TASK_SCHEDULER_DEFAULT_PIPELINE: list[type[BaseTask]] = [
    ValidateNoteTask,
    AccessControlTask,
    EntryClassCreationTask,
    EntryPopulationTask,
    SmartLinkerTask,
    LinkFilesTask,
    MetadataProcessTask,
    AliasConnectionTask,
    FinalizeNoteTask,
]

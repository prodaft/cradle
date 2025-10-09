from entries.serializers import EntryResponseSerializer
from notes.serializers import NoteRetrieveSerializer
from rest_framework import serializers


class StatisticsNoteSerializer:
    """Serializer for notes in statistics"""

    def __init__(self, truncate=150, many=False):
        self.truncate = truncate
        self.many = many

    def to_representation(self, notes_data=None):
        data_source = notes_data if notes_data is not None else self._data
        if self.many:
            return [self._serialize_note(note) for note in data_source]
        else:
            return self._serialize_note(data_source)

    def _serialize_note(self, note):
        """Serialize a single note for statistics"""
        content = note.content

        if self.truncate > -1 and len(content) - note.content_offset > self.truncate:
            content = (
                content[note.content_offset : note.content_offset + self.truncate]
                + "..."
            )

        return {
            "id": str(note.id),
            "content": content,
            "title": note.title,
            "timestamp": note.timestamp.isoformat(),
            "author": {"id": str(note.author.id), "username": note.author.username}
            if note.author
            else None,
        }


class StatisticsEntrySerializer:
    """Serializer for entries in statistics"""

    def __init__(self, many=False):
        self.many = many

    def to_representation(self, entries_data=None):
        data_source = entries_data if entries_data is not None else self._data
        if self.many:
            return [self._serialize_entry(entry) for entry in data_source]
        else:
            return self._serialize_entry(data_source)

    def _serialize_entry(self, entry):
        """Serialize a single entry for statistics"""
        return {
            "id": str(entry.id),
            "name": entry.name,
            "type": entry.entry_class.type if entry.entry_class else None,
            "subtype": entry.entry_class.subtype if entry.entry_class else None,
        }


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteRetrieveSerializer(truncate=150, many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)

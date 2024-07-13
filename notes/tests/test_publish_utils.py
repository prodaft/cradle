from .utils import NotesTestEntity
from ..models import Note
from entries.enums import EntryType, MetadataSubtype, ArtifactSubtype
from entries.models import Entry
from ..utils.publish_utils import PublishUtils


class GetReportTest(NotesTestEntity):

    def setUp(self):
        super().setUp()
        self.entities = []
        self.metadata = []
        for i in range(0, 4):
            self.entities.append(Entry.objects.create(name=f"{i}", type=EntryType.ENTITY))


        self.artifact = Entry.objects.create(
            name=f"{0}", type=EntryType.ARTIFACT, subtype=ArtifactSubtype.IP
        )

        self.notes = []
        self.notes.append(Note.objects.create(content=f"{0}"))
        self.notes.append(Note.objects.create(content=f"{1}"))

        self.notes[0].entries.add(self.entities[0])
        self.notes[1].entries.add(self.entities[0])
        self.notes[1].entries.add(self.artifact)
        self.notes[1].entries.add(self.metadata[0])

    def test_get_report_all_notes(self):
        note_queryset = Note.objects.all()
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct entities are retrieved."):
            entities_queryset = Entry.objects.filter(id=self.entities[0].id)
            self.assertQuerySetEqual(report["entities"], entities_queryset)

        with self.subTest("Correct artifacts are retrieved."):
            artifacts_queryset = Entry.objects.filter(id=self.artifact.id)
            self.assertQuerySetEqual(report["artifacts"], artifacts_queryset)

    def test_get_report_some_notes(self):
        self.notes[1].entries.remove(self.entities[0])
        self.notes[1].entries.add(self.entities[1])
        note_queryset = Note.objects.filter(id=self.notes[0].id)
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct entities are retrieved."):
            entities_queryset = Entry.objects.filter(id=self.entities[0].id)
            self.assertQuerySetEqual(report["entities"], entities_queryset)

        with self.subTest("Correct artifacts are retrieved."):
            artifacts_queryset = Entry.objects.none()
            self.assertQuerySetEqual(report["artifacts"], artifacts_queryset)


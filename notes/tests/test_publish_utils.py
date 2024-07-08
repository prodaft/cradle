from .utils import NotesTestCase
from ..models import Note
from entries.enums import EntryType, MetadataSubtype, ArtifactSubtype
from entries.models import Entry
from ..utils.publish_utils import PublishUtils


class GetReportTest(NotesTestCase):

    def setUp(self):
        super().setUp()
        self.cases = []
        self.metadata = []
        for i in range(0, 4):
            self.cases.append(Entry.objects.create(name=f"{i}", type=EntryType.CASE))

        for i in range(0, 2):
            self.metadata.append(
                Entry.objects.create(
                    name=f"{i}",
                    type=EntryType.METADATA,
                    subtype=MetadataSubtype.COMPANY,
                )
            )

        self.artifact = Entry.objects.create(
            name=f"{0}", type=EntryType.ARTIFACT, subtype=ArtifactSubtype.IP
        )

        self.actor = Entry.objects.create(name=f"{1}", type=EntryType.ACTOR)

        self.notes = []
        self.notes.append(Note.objects.create(content=f"{0}"))
        self.notes.append(Note.objects.create(content=f"{1}"))

        self.notes[0].entries.add(self.cases[0])
        self.notes[0].entries.add(self.actor)
        self.notes[1].entries.add(self.cases[0])
        self.notes[1].entries.add(self.artifact)
        self.notes[1].entries.add(self.metadata[0])

    def test_get_report_all_notes(self):
        note_queryset = Note.objects.all()
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct cases are retrieved."):
            cases_queryset = Entry.objects.filter(id=self.cases[0].id)
            self.assertQuerySetEqual(report["cases"], cases_queryset)

        with self.subTest("Correct artifacts are retrieved."):
            artifacts_queryset = Entry.objects.filter(id=self.artifact.id)
            self.assertQuerySetEqual(report["artifacts"], artifacts_queryset)

        with self.subTest("Correct metadata is retrieved."):
            metadata_queryset = Entry.objects.filter(id=self.metadata[0].id)
            self.assertQuerySetEqual(report["metadata"], metadata_queryset)

        with self.subTest("Correct actors are retrieved."):
            actors_queryset = Entry.objects.filter(id=self.actor.id)
            self.assertQuerySetEqual(report["actors"], actors_queryset)

    def test_get_report_some_notes(self):
        self.notes[1].entries.remove(self.cases[0])
        self.notes[1].entries.add(self.cases[1])
        note_queryset = Note.objects.filter(id=self.notes[0].id)
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct cases are retrieved."):
            cases_queryset = Entry.objects.filter(id=self.cases[0].id)
            self.assertQuerySetEqual(report["cases"], cases_queryset)

        with self.subTest("Correct artifacts are retrieved."):
            artifacts_queryset = Entry.objects.none()
            self.assertQuerySetEqual(report["artifacts"], artifacts_queryset)

        with self.subTest("Correct metadata is retrieved."):
            metadata_queryset = Entry.objects.none()
            self.assertQuerySetEqual(report["metadata"], metadata_queryset)

        with self.subTest("Correct actors are retrieved."):
            actors_queryset = Entry.objects.filter(id=self.actor.id)
            self.assertQuerySetEqual(report["actors"], actors_queryset)

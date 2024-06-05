from .utils import NotesTestCase
from ..models import Note
from entities.enums import EntityType, MetadataSubtype, EntrySubtype
from entities.models import Entity
from ..utils.publish_utils import PublishUtils


class GetReportTest(NotesTestCase):

    def setUp(self):
        super().setUp()
        self.cases = []
        self.metadata = []
        for i in range(0, 4):
            self.cases.append(Entity.objects.create(name=f"{i}", type=EntityType.CASE))

        for i in range(0, 2):
            self.metadata.append(
                Entity.objects.create(
                    name=f"{i}",
                    type=EntityType.METADATA,
                    subtype=MetadataSubtype.COMPANY,
                )
            )

        self.entry = Entity.objects.create(
            name=f"{0}", type=EntityType.ENTRY, subtype=EntrySubtype.IP
        )

        self.actor = Entity.objects.create(name=f"{1}", type=EntityType.ACTOR)

        self.notes = []
        self.notes.append(Note.objects.create(content=f"{0}"))
        self.notes.append(Note.objects.create(content=f"{1}"))

        self.notes[0].entities.add(self.cases[0])
        self.notes[0].entities.add(self.actor)
        self.notes[1].entities.add(self.cases[0])
        self.notes[1].entities.add(self.entry)
        self.notes[1].entities.add(self.metadata[0])

    def test_get_report_all_notes(self):
        note_queryset = Note.objects.all()
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct cases are retrieved."):
            cases_queryset = Entity.objects.filter(id=self.cases[0].id)
            self.assertQuerySetEqual(report["cases"], cases_queryset)

        with self.subTest("Correct entries are retrieved."):
            entries_queryset = Entity.objects.filter(id=self.entry.id)
            self.assertQuerySetEqual(report["entries"], entries_queryset)

        with self.subTest("Correct metadata is retrieved."):
            metadata_queryset = Entity.objects.filter(id=self.metadata[0].id)
            self.assertQuerySetEqual(report["metadata"], metadata_queryset)

        with self.subTest("Correct actors are retrieved."):
            actors_queryset = Entity.objects.filter(id=self.actor.id)
            self.assertQuerySetEqual(report["actors"], actors_queryset)

    def test_get_report_some_notes(self):
        self.notes[1].entities.remove(self.cases[0])
        self.notes[1].entities.add(self.cases[1])
        note_queryset = Note.objects.filter(id=self.notes[0].id)
        report = PublishUtils.get_report(note_queryset)

        with self.subTest("Notes remain the same."):
            self.assertQuerySetEqual(report["notes"], note_queryset, ordered=False)

        with self.subTest("Correct cases are retrieved."):
            cases_queryset = Entity.objects.filter(id=self.cases[0].id)
            self.assertQuerySetEqual(report["cases"], cases_queryset)

        with self.subTest("Correct entries are retrieved."):
            entries_queryset = Entity.objects.none()
            self.assertQuerySetEqual(report["entries"], entries_queryset)

        with self.subTest("Correct metadata is retrieved."):
            metadata_queryset = Entity.objects.none()
            self.assertQuerySetEqual(report["metadata"], metadata_queryset)

        with self.subTest("Correct actors are retrieved."):
            actors_queryset = Entity.objects.filter(id=self.actor.id)
            self.assertQuerySetEqual(report["actors"], actors_queryset)

from django.utils.translation import gettext_lazy as _
from django.db import models
from ..enums import concatenate_enums
from .utils import EntriesTestCase


class TextChoicesConcatenationTest(EntriesTestCase):

    def test_concatenate_enums(self):

        class FirstTextChoice(models.TextChoices):
            FIELD_A = "field_a", _("Field A")
            FIELD_B = "field_b", _("Field B")

        class SecondTextChoice(models.TextChoices):
            FIELD_C = "field_c", _("Field C")
            FIELD_D = "field_d", _("Field D")

        class ExpectedTextChoice(models.TextChoices):
            FIELD_A = "field_a", _("Field A")
            FIELD_B = "field_b", _("Field B")
            FIELD_C = "field_c", _("Field C")
            FIELD_D = "field_d", _("Field D")

        expected_dictionary = {
            "FIELD_A": ("field_a", "Field A"),
            "FIELD_B": ("field_b", "Field B"),
            "FIELD_C": ("field_c", "Field C"),
            "FIELD_D": ("field_d", "Field D"),
        }

        obtained_dictionary = concatenate_enums(FirstTextChoice, SecondTextChoice)

        self.assertEqual(expected_dictionary, obtained_dictionary)

        self.assertEqual(
            ExpectedTextChoice.choices,
            models.TextChoices("ExpectedTextChoice", obtained_dictionary).choices,
        )

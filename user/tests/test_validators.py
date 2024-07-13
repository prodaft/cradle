from .utils import UserTestEntity
from ..utils.validators import (
    MinimumUpperentityLettersValidator,
    MinimumDigitsValidator,
    MinimumLowerentityLettersValidator,
    MinimumSpecialCharacterValidator,
)

from django.core.exceptions import ValidationError


class MinimumUpperentityLettersValidatorTest(UserTestEntity):

    def test_upperentity_validator_successful(self):
        tests = [
            ("aaaaaaa", 0),
            ("", 0),
            ("AaAaAAAa", 5),
            ("BACsfafAD", 2),
            ("basfaAAAa", 3),
            ("AaaFAf241", 2),
            ("!@3AdfaGADA", 3),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"):
                self.assertEqual(
                    MinimumUpperentityLettersValidator(tests[i][1]).validate(tests[i][0]),
                    None,
                )

    def test_upperentity_validator_unsucessful(self):
        tests = [
            ("aaaaaaa", 1),
            ("", 1),
            ("AaAaAAAa", 6),
            ("BACsfafAD", 8),
            ("basfaAAAa", 20),
            ("AaaFAf241", 4),
            ("!@3AdfaGADA", 6),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"), self.assertRaises(ValidationError):
                MinimumUpperentityLettersValidator(tests[i][1]).validate(tests[i][0])


class MinimumLowerentityLettersValidatorTest(UserTestEntity):

    def test_lowerentity_validator_successful(self):
        tests = [
            ("password", 4),
            ("lowerENTITYletters", 6),
            ("mixEDentityLETters", 5),
            ("someLowerentity", 5),
            ("alllowerentity", 5),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"):
                self.assertEqual(
                    MinimumLowerentityLettersValidator(tests[i][1]).validate(tests[i][0]),
                    None,
                )

    def test_lowerentity_validator_unsucessful(self):
        tests = [
            ("PASSWORD", 1),
            ("P@SSW0RD", 1),
            ("NOLOWERENTITY", 3),
            ("FEWlOWERENTITY", 4),
            ("AlmosTALLUPPER", 5),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"), self.assertRaises(ValidationError):
                MinimumLowerentityLettersValidator(tests[i][1]).validate(tests[i][0])


class MinimumDigitsValidatorTest(UserTestEntity):

    def test_digits_validator_successful(self):
        tests = [
            ("password123", 3),
            ("12345", 5),
            ("mix3dDigits1", 2),
            ("s0m3Digits", 1),
            ("many12345digits", 5),
            ("1w@nt2br3@kfr33", 2),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"):
                self.assertEqual(
                    MinimumDigitsValidator(tests[i][1]).validate(tests[i][0]), None
                )

    def test_digits_validator_unsucessful(self):
        tests = [
            ("password", 1),
            ("passw0rd", 2),
            ("d1g1t", 3),
            ("few123", 4),
            ("noDigitsHere", 1),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"), self.assertRaises(ValidationError):
                MinimumDigitsValidator(tests[i][1]).validate(tests[i][0])


class MinimumSpecialCharactersValidatorTest(UserTestEntity):

    def test_special_validator_successful(self):
        tests = [
            ("p@ssw!rd#", 3),
            ("pa$$word@", 3),
            ("$pec!al#chars!", 3),
            ("symbo!#t3st$", 3),
            ("multiple!@#$%^&", 5),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"):
                self.assertEqual(
                    MinimumSpecialCharacterValidator(tests[i][1]).validate(tests[i][0]),
                    None,
                )

    def test_special_validator_unsucessful(self):
        tests = [
            ("password", 1),
            ("pass@word", 2),
            ("p@ssword", 2),
            ("!special", 2),
            ("symbol@", 2),
        ]

        for i in range(0, len(tests)):
            with self.subTest(f"{i}"), self.assertRaises(ValidationError):
                MinimumSpecialCharacterValidator(tests[i][1]).validate(tests[i][0])

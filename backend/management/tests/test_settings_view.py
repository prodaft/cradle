from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..models import Setting
from ..settings import FileSettings, cradle_settings


class SettingsPatchTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        cache.clear()
        self.addCleanup(cache.clear)  # saved settings are cached and would leak into later tests
        self.client = APIClient()
        admin = CradleUser.objects.create_user(username="admin", password="pw", email="a@b.c", role=UserRoles.ADMIN)
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def patch_settings(self, body):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.patch(reverse("settings"), body, format="json", **self.headers)

    def test_valid_update_is_saved_and_visible(self):
        response = self.patch_settings({"users": {"allow_registration": False}, "notes": {"min_entries": 3}})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(response.json()["updated"], ["users.allow_registration", "notes.min_entries"])
        self.assertIs(cradle_settings.users.allow_registration, False)
        self.assertEqual(cradle_settings.notes.min_entries, 3)

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        cases = [
            ("users", "allow_registration", "false"),
            ("notes", "min_entries", "3"),
            ("notes", "min_entries", True),
            ("notes", "min_entries", -1),
            ("files", "md5_subtype", 5),
            ("notes", "no_such_setting", 1),
        ]
        for section, key, value in cases:
            with self.subTest(key=key, value=value):
                response = self.patch_settings({"files": {"autoprocess_files": False}, section: {key: value}})

                self.assertEqual(response.status_code, 400, response.content)
                self.assertIn(f"{section}.{key}", str(response.content))
                self.assertFalse(Setting.objects.exists())

    def test_null_resets_to_default(self):
        self.patch_settings({"files": {"upload_limit": 1024}})
        self.assertEqual(cradle_settings.files.upload_limit, 1024)

        response = self.patch_settings({"files": {"upload_limit": None}})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(Setting.objects.filter(key="files.upload_limit").exists())
        self.assertEqual(cradle_settings.files.upload_limit, 2**31)

    def test_non_object_body_is_400(self):
        self.assertEqual(self.patch_settings(["notes"]).status_code, 400)

    def test_section_defaults_come_from_properties(self):
        self.assertEqual(FileSettings.defaults()["upload_limit"], 2**31)
        self.assertIs(FileSettings.defaults()["autoprocess_files"], True)


class SettingCacheInvalidationTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def test_orm_writes_clear_the_cached_value_after_commit(self):
        """Edits outside the API (shell, admin) must not leave the old value cached."""
        self.assertEqual(cradle_settings.notes.min_entries, 2)  # caches the default

        with self.captureOnCommitCallbacks(execute=True):
            setting = Setting.objects.create(key="notes.min_entries", value=5)
        self.assertEqual(cradle_settings.notes.min_entries, 5)

        with self.captureOnCommitCallbacks(execute=True):
            setting.delete()
        self.assertEqual(cradle_settings.notes.min_entries, 2)

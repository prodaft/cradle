"""The API key migration revokes old bcrypt keys and tells their owners."""

import importlib

from django.apps import apps

from notifications.models import MessageNotification

from ..models import CradleUser
from .utils import UserTestCase

migration = importlib.import_module("user.migrations.0036_api_key_sha256_digest")


class RevokeBcryptKeysTest(UserTestCase):
    def test_revokes_keys_and_notifies_only_their_owners(self):
        holder = CradleUser.objects.create_user(username="holder", password="p", email="h@example.com")
        CradleUser.objects.filter(pk=holder.pk).update(api_key="$2b$12$oldbcrypthash")
        other = CradleUser.objects.create_user(username="other", password="p", email="o@example.com")
        blank = CradleUser.objects.create_user(username="blank", password="p", email="b@example.com")
        CradleUser.objects.filter(pk=blank.pk).update(api_key="")

        migration.revoke_bcrypt_keys(apps, None)

        self.assertFalse(CradleUser.objects.exclude(api_key__isnull=True).exists())
        self.assertEqual(MessageNotification.objects.filter(user=holder).count(), 1)
        self.assertFalse(MessageNotification.objects.filter(user__in=[other, blank]).exists())

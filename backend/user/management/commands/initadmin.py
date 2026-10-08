"""Create initial admin user when no users exist."""

import os
import random
import string

from django.core.management.base import BaseCommand

from ...models import CradleUser


class Command(BaseCommand):
    """Create admin user from env vars (CRADLE_ADMIN_USER, CRADLE_ADMIN_PASSWORD, CRADLE_ADMIN_EMAIL)."""

    def handle(self, *args, **options):
        """Create an admin user if no users exist.

        Uses CRADLE_ADMIN_USER, CRADLE_ADMIN_PASSWORD, CRADLE_ADMIN_EMAIL env vars
        (defaults: admin, random 20-char password, admin@prodaft.com).
        Run: python manage.py initadmin
        """
        if CradleUser.objects.count() == 0:
            username = os.environ.get("CRADLE_ADMIN_USER", "admin")

            alphabet = string.ascii_letters + string.digits + string.punctuation

            password = os.environ.get("CRADLE_ADMIN_PASSWORD", "".join(random.choices(alphabet, k=20)))
            email = os.environ.get("CRADLE_ADMIN_EMAIL", "admin@prodaft.com")
            self.stdout.write(f"Creating admin account: {username}")
            self.stdout.write(f"With password {password}")
            self.stdout.write(f"And email {email}")
            CradleUser.objects.create_superuser(
                username=username,
                password=password,
                email=email,
                email_confirmed=True,
            )
        else:
            self.stdout.write("Admin can only be initialized when no users exist")

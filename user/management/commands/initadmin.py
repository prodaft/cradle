import os
import random
import string

from django.core.management.base import BaseCommand
from user.models import CradleUser


class Command(BaseCommand):
    def handle(self, *args, **options):
        """Creates an admin user if no users exist.

        If there are no existing users in the CradleUser model, this method
        creates an admin user with a username and password fetched from
        environment variables or defaults. The default username for the
        admin is 'admin' and the password is randomly generated.

        It prints the credentials to the console.

        To run this command use:

        ```python manage.py initadmin```

        Args:
            *args: Variable length argument list.
            **options: Arbitrary keyword arguments.
        """
        if CradleUser.objects.count() == 0:
            username = os.environ.get("CRADLE_ADMIN_USER", "admin")

            alphabet = string.ascii_letters + string.digits + string.punctuation

            password = os.environ.get(
                "CRADLE_ADMIN_PASSWORD", "".join(random.choices(alphabet, k=20))
            )
            email = os.environ.get("CRADLE_ADMIN_EMAIL", "admin@prodaft.com")
            print("Creating admin account: %s" % username)
            print("With password %s" % password)
            print("And email %s" % email)
            admin = CradleUser.objects.create_superuser(
                username=username,
                password=password,
                email=email,
                email_confirmed=True,
                role="admin",
                is_active=True,
            )
            admin.is_active = True
            admin.is_admin = True
            admin.save()
        else:
            print("Admin accounts can only be initialized if no Accounts exist")

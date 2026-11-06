"""Switch API keys from bcrypt hashes to indexed SHA-256 digests.

Existing keys are stored only as bcrypt hashes and cannot be converted, so they are revoked. Each affected
user gets an in-app notification asking them to generate a new key.
"""

from django.db import migrations, models


def revoke_bcrypt_keys(apps, schema_editor):
    CradleUser = apps.get_model("user", "CradleUser")
    MessageNotification = apps.get_model("notifications", "MessageNotification")

    holders = CradleUser.objects.exclude(api_key__isnull=True).exclude(api_key="")
    MessageNotification.objects.bulk_create(
        MessageNotification(
            user_id=user_id,
            message="Your API key was revoked during a security upgrade. Generate a new one in your account settings.",
        )
        for user_id in holders.values_list("id", flat=True)
    )
    # Empty strings become NULL too: the field turns unique next, and several "" values would collide.
    CradleUser.objects.exclude(api_key__isnull=True).update(api_key=None)


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0035_remove_usersession_is_current"),
        ("notifications", "0012_teammembershipnotification"),
    ]

    operations = [
        migrations.RunPython(revoke_bcrypt_keys, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cradleuser",
            name="api_key",
            field=models.CharField(
                blank=True,
                help_text="SHA-256 hex digest of the API key; the key itself is shown once and never stored",
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
    ]

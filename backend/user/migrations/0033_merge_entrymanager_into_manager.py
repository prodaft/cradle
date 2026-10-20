from django.db import migrations, models


def entrymanager_to_manager(apps, schema_editor):
    CradleUser = apps.get_model("user", "CradleUser")
    CradleUser.objects.filter(role="entrymanager").update(role="manager")


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0032_remove_blacklistedtoken_user_blackl_jti_2e059c_idx_and_more"),
    ]

    operations = [
        # Not reversible: after this, former entry managers can't be told apart from managers.
        migrations.RunPython(entrymanager_to_manager, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cradleuser",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("manager", "Manager"), ("author", "User")],
                default="author",
                help_text="User role for access control",
                max_length=32,
            ),
        ),
    ]

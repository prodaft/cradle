# Generated by Django 5.0.4 on 2025-01-02 09:24

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "user",
            "0007_rename_password_reset_token_expiration_cradleuser_password_reset_token_expiry",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="cradleuser",
            name="email_confirmed",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="cradleuser",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]

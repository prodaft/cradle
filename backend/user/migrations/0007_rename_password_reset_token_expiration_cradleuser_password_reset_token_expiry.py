# Generated by Django 5.0.4 on 2024-12-02 15:07

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0006_cradleuser_email_confirmation_token_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="cradleuser",
            old_name="password_reset_token_expiration",
            new_name="password_reset_token_expiry",
        ),
    ]

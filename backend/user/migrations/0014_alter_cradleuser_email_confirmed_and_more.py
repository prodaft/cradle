# Generated by Django 5.0.4 on 2025-04-02 21:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0013_alter_cradleuser_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cradleuser",
            name="email_confirmed",
            field=models.BooleanField(),
        ),
        migrations.AlterField(
            model_name="cradleuser",
            name="is_active",
            field=models.BooleanField(),
        ),
    ]

from django.apps import AppConfig


class UserConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "user"

    def ready(self):
        # Import schema to ensure DRF Spectacular extensions are loaded
        import user.schema  # noqa

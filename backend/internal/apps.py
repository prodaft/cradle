from django.apps import AppConfig


class InternalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "internal"

    def ready(self):
        # Import schema to ensure DRF Spectacular extensions are loaded
        import internal.schema  # noqa: F401

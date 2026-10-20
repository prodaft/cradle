"""User app configuration."""

from django.apps import AppConfig


class UserConfig(AppConfig):
    name = "user"

    def ready(self):
        from . import schema, signals  # noqa: F401
